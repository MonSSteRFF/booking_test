import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import Redis from "ioredis";
import type { Model } from "mongoose";
import type { FetchManySlotsDto } from "../dto/fetch-many-slots.dto";
import type { SlotDocument } from "../schemas/slot.schema";
import { Slot } from "../schemas/slot.schema";

@Injectable()
export class SlotsClickhouseSyncService implements OnModuleInit {
	private chClient: ClickHouseClient;
	private redis: Redis;

	constructor(
		private config: ConfigService,
		@InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
	) {
		const clickhouseUrl = this.config.get<string>("clickhouseUrl");
		if (!clickhouseUrl) {
			throw new Error("clickhouseUrl is not defined in config");
		}
		this.chClient = createClient({
			url: clickhouseUrl,
			username: this.config.get<string>("clickhouseUser"),
			password: this.config.get<string>("clickhousePassword"),
		});

		const redisUrl = this.config.get<string>("redisUrl");
		if (!redisUrl) {
			throw new Error("redisUrl is not defined in config");
		}
		this.redis = new Redis(redisUrl);
	}

	async onModuleInit() {
		await this.chClient.query({ query: "CREATE DATABASE IF NOT EXISTS booking_app" }).then((r) => r.text());
		await this.chClient
			.query({
				query: `
        CREATE TABLE IF NOT EXISTS booking_app.slots (
          mongo_id      String,
          title         String,
          starts_at     DateTime('UTC'),
          capacity      UInt32,
          booked_count  UInt32,
          is_active     UInt8,
          created_at    DateTime('UTC'),
          updated_at    DateTime('UTC')
        ) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (mongo_id)
      `,
			})
			.then((r) => r.text());
	}

	async syncOnWrite(slot: SlotDocument) {
		try {
			await this.chClient.insert({
				table: "booking_app.slots",
				values: [
					{
						mongo_id: slot._id.toString(),
						title: slot.title,
						starts_at: Math.floor(new Date(slot.startsAt).getTime() / 1000),
						capacity: slot.capacity,
						booked_count: slot.bookedCount,
						is_active: slot.isActive ? 1 : 0,
						created_at: slot.createdAt ? Math.floor(new Date(slot.createdAt).getTime() / 1000) : 0,
						updated_at: slot.updatedAt ? Math.floor(new Date(slot.updatedAt).getTime() / 1000) : 0,
					},
				],
				format: "JSONEachRow",
			});
			// Сбрасываем флаг только после успешной вставки
			await this.slotModel.updateOne({ _id: slot._id }, { chSyncPending: false });
		} catch (err) {
			// Ошибка просто логируется, флаг остаётся true
			console.error("Sync-on-write failed for slot", slot._id, err);
		}
	}

	@Cron("*/10 * * * * *") // каждые 10 секунд
	async backgroundSync() {
		// Берём распределённый лок в Redis
		const lockKey = "slots_background_sync_lock";
		const acquired = await this.redis.set(lockKey, "1", "EX", 9, "NX"); // TTL 9s < интервал
		if (!acquired) return;

		try {
			const pendingSlots = await this.slotModel.find({ chSyncPending: true }).exec();
			if (pendingSlots.length === 0) return;

			const values = pendingSlots.map((slot) => ({
				mongo_id: slot._id.toString(),
				title: slot.title,
				starts_at: Math.floor(new Date(slot.startsAt).getTime() / 1000),
				capacity: slot.capacity,
				booked_count: slot.bookedCount,
				is_active: slot.isActive ? 1 : 0,
				created_at: slot.createdAt ? Math.floor(new Date(slot.createdAt).getTime() / 1000) : 0,
				updated_at: slot.updatedAt ? Math.floor(new Date(slot.updatedAt).getTime() / 1000) : 0,
			}));

			await this.chClient.insert({
				table: "booking_app.slots",
				values,
				format: "JSONEachRow",
			});

			// Сбрасываем флаги
			await this.slotModel.updateMany({ _id: { $in: pendingSlots.map((s) => s._id) } }, { chSyncPending: false });
		} catch (err) {
			console.error("Background sync failed", err);
		} finally {
			// Lock expires via TTL; do NOT delete here to avoid race
			// with another instance that may have acquired it after expiry
		}
	}

	async fetchSlots(dto: FetchManySlotsDto) {
		const SLOT_FIELD_MAP: Record<string, string> = {
			createdAt: "created_at",
			updatedAt: "updated_at",
			startsAt: "starts_at",
			bookedCount: "booked_count",
			isActive: "is_active",
		};

		const conditions: string[] = ["1=1"];
		const queryParams: Record<string, unknown> = {};
		let paramIdx = 0;

		if (dto.columnFilters) {
			for (const f of dto.columnFilters) {
				if (f.id === "isActive" && f.value) {
					const key = `p${paramIdx++}`;
					conditions.push(`is_active = {${key}:UInt8}`);
					queryParams[key] = f.value[0] === "true" ? 1 : 0;
				} else if (f.id === "title" && f.value) {
					const key = `p${paramIdx++}`;
					conditions.push(`title LIKE {${key}:String}`);
					queryParams[key] = `%${f.value}%`;
				}
			}
		}
		if (dto.dateRange) {
			const field = dto.dateRange.field === "created_at" ? "created_at" : "starts_at";
			const keyFrom = `p${paramIdx++}`;
			const keyTo = `p${paramIdx++}`;
			conditions.push(`${field} >= {${keyFrom}:DateTime}`);
			conditions.push(`${field} <= {${keyTo}:DateTime}`);
			queryParams[keyFrom] = dto.dateRange.from;
			queryParams[keyTo] = dto.dateRange.to;
		}

		const where = conditions.join(" AND ");

		const orderBy = dto.sorting?.length
			? dto.sorting.map((s) => `${SLOT_FIELD_MAP[s.id] || s.id} ${s.desc ? "DESC" : "ASC"}`).join(", ")
			: "created_at DESC";

		const countQuery = `SELECT count() AS total FROM booking_app.slots FINAL WHERE ${where}`;
		const countResult = await this.chClient.query({
			query: countQuery,
			query_params: queryParams,
		});
		const totalCount = ((await countResult.json()) as any).data[0].total;

		const pageIndex = dto.pageIndex ?? 0;
		const pageSize = dto.pageSize ?? 10;
		const offset = pageIndex * pageSize;
		const dataQuery = `SELECT * FROM booking_app.slots FINAL WHERE ${where} ORDER BY ${orderBy} LIMIT {limit:UInt32} OFFSET {offset:UInt32}`;
		const dataResult = await this.chClient.query({
			query: dataQuery,
			query_params: { ...queryParams, limit: pageSize, offset },
		});
		const rows = ((await dataResult.json()) as any).data;

		const data = rows.map((row: any) => ({
			mongoId: row.mongo_id,
			title: row.title,
			startsAt: Math.floor(new Date(`${String(row.starts_at).replace(' ', 'T')}Z`).getTime() / 1000),
			capacity: row.capacity,
			bookedCount: row.booked_count,
			isActive: row.is_active === 1,
			createdAt: Math.floor(new Date(`${String(row.created_at).replace(' ', 'T')}Z`).getTime() / 1000),
			updatedAt: Math.floor(new Date(`${String(row.updated_at).replace(' ', 'T')}Z`).getTime() / 1000),
		}));

		return { data, totalCount: Number(totalCount) };
	}
}

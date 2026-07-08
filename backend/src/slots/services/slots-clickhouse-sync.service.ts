import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import Redis from "ioredis";
import type { Model } from "mongoose";
import type { FetchManyDto } from "../dto/fetch-many.dto";
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
		this.chClient = createClient({ url: clickhouseUrl });

		const redisUrl = this.config.get<string>("redisUrl");
		if (!redisUrl) {
			throw new Error("redisUrl is not defined in config");
		}
		this.redis = new Redis(redisUrl);
	}

	async onModuleInit() {
		await this.chClient.exec({
			query: "CREATE DATABASE IF NOT EXISTS booking_app",
		});
		await this.chClient.exec({
			query: `
        CREATE TABLE IF NOT EXISTS booking_app.slots (
          mongo_id String,
          title String,
          starts_at DateTime('UTC'),
          capacity UInt32,
          booked_count UInt32,
          is_active UInt8,
          created_at DateTime('UTC'),
          updated_at DateTime('UTC')
        ) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (mongo_id)
      `,
		});
	}

	async syncOnWrite(slot: SlotDocument) {
		try {
			await this.chClient.insert({
				table: "booking_app.slots",
				values: [
					{
						mongo_id: slot._id.toString(),
						title: slot.title,
						starts_at: slot.startsAt,
						capacity: slot.capacity,
						booked_count: slot.bookedCount,
						is_active: slot.isActive ? 1 : 0,
						created_at: slot.createdAt,
						updated_at: slot.updatedAt,
					},
				],
				format: "JSONEachRow",
			});
			// Сбрасываем флаг только после успешной вставки
			await this.slotModel.updateOne(
				{ _id: slot._id },
				{ chSyncPending: false },
			);
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
			const pendingSlots = await this.slotModel
				.find({ chSyncPending: true })
				.exec();
			if (pendingSlots.length === 0) return;

			const values = pendingSlots.map((slot) => ({
				mongo_id: slot._id.toString(),
				title: slot.title,
				starts_at: slot.startsAt,
				capacity: slot.capacity,
				booked_count: slot.bookedCount,
				is_active: slot.isActive ? 1 : 0,
				created_at: slot.createdAt,
				updated_at: slot.updatedAt,
			}));

			await this.chClient.insert({
				table: "booking_app.slots",
				values,
				format: "JSONEachRow",
			});

			// Сбрасываем флаги
			await this.slotModel.updateMany(
				{ _id: { $in: pendingSlots.map((s) => s._id) } },
				{ chSyncPending: false },
			);
		} catch (err) {
			console.error("Background sync failed", err);
		} finally {
			await this.redis.del(lockKey);
		}
	}

	async fetchSlots(dto: FetchManyDto) {
		// Строим запрос к ClickHouse с FINAL, фильтрами, сортировкой, пагинацией
		let where = "1=1";
		if (dto.columnFilters) {
			for (const f of dto.columnFilters) {
				if (f.id === "isActive" && f.value) {
					where += ` AND is_active = ${f.value[0] === "true" ? 1 : 0}`;
				} else if (f.id === "title" && f.value) {
					where += ` AND title LIKE '%${f.value}%'`;
				}
			}
		}
		if (dto.dateRange) {
			const field =
				dto.dateRange.field === "created_at" ? "created_at" : "starts_at";
			where += ` AND ${field} >= '${dto.dateRange.from}' AND ${field} <= '${dto.dateRange.to}'`;
		}

		const orderBy = dto.sorting?.length
			? dto.sorting
					.map(
						(s) =>
							`${s.id === "createdAt" ? "created_at" : s.id} ${s.desc ? "DESC" : "ASC"}`,
					)
					.join(", ")
			: "created_at DESC";

		const countQuery = `SELECT count() AS total FROM booking_app.slots FINAL WHERE ${where}`;
		const countResult = await this.chClient.query({ query: countQuery });
		const totalCount = ((await countResult.json()) as any).data[0].total;

		const offset = dto.pageIndex * dto.pageSize;
		const dataQuery = `SELECT * FROM booking_app.slots FINAL WHERE ${where} ORDER BY ${orderBy} LIMIT ${dto.pageSize} OFFSET ${offset}`;
		const dataResult = await this.chClient.query({ query: dataQuery });
		const rows = ((await dataResult.json()) as any).data;

		const data = rows.map((row: any) => ({
			mongoId: row.mongo_id,
			title: row.title,
			startsAt: row.starts_at,
			capacity: row.capacity,
			bookedCount: row.booked_count,
			isActive: row.is_active === 1,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));

		return { data, totalCount: Number(totalCount) };
	}
}

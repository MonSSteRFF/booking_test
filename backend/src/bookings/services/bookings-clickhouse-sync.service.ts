import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import Redis from "ioredis";
import type { Model } from "mongoose";
import type { FetchManyDto } from "../../slots/dto/fetch-many.dto";
import { Booking, type BookingDocument } from "../schemas/booking.schema";

@Injectable()
export class BookingsClickhouseSyncService implements OnModuleInit {
	private chClient: ClickHouseClient;
	private redis: Redis;

	constructor(
		private config: ConfigService,
		@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
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
        CREATE TABLE IF NOT EXISTS booking_app.bookings (
          mongo_id       String,
          slot_mongo_id  String,
          slot_title     String,
          slot_starts_at DateTime('UTC'),
          client_name    String,
          client_email   String,
          status         LowCardinality(String),
          created_at     DateTime('UTC'),
          updated_at     DateTime('UTC')
        ) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (mongo_id)
      `,
		});
	}

	async syncOnWrite(booking: BookingDocument) {
		try {
			await this.chClient.insert({
				table: "booking_app.bookings",
				values: [
					{
						mongo_id: booking._id.toString(),
						slot_mongo_id: booking.slotId,
						slot_title: booking.slotTitle,
						slot_starts_at: booking.slotStartsAt,
						client_name: booking.clientName,
						client_email: booking.clientEmail,
						status: booking.status,
						created_at: booking.createdAt,
						updated_at: booking.updatedAt,
					},
				],
				format: "JSONEachRow",
			});
			await this.bookingModel.updateOne(
				{ _id: booking._id },
				{ chSyncPending: false },
			);
		} catch (err) {
			console.error("Booking sync-on-write failed", booking._id, err);
		}
	}

	@Cron("*/10 * * * * *")
	async backgroundSync() {
		const lockKey = "bookings_background_sync_lock";
		const acquired = await this.redis.set(lockKey, "1", "EX", 9, "NX");
		if (!acquired) return;

		try {
			const pending = await this.bookingModel
				.find({ chSyncPending: true })
				.exec();
			if (pending.length === 0) return;

			const values = pending.map((b) => ({
				mongo_id: b._id.toString(),
				slot_mongo_id: b.slotId,
				slot_title: b.slotTitle,
				slot_starts_at: b.slotStartsAt,
				client_name: b.clientName,
				client_email: b.clientEmail,
				status: b.status,
				created_at: b.createdAt,
				updated_at: b.updatedAt,
			}));

			await this.chClient.insert({
				table: "booking_app.bookings",
				values,
				format: "JSONEachRow",
			});

			await this.bookingModel.updateMany(
				{ _id: { $in: pending.map((b) => b._id) } },
				{ chSyncPending: false },
			);
		} catch (err) {
			console.error("Booking background sync failed", err);
		} finally {
			// Lock expires via TTL; do NOT delete here to avoid race
			// with another instance that may have acquired it after expiry
		}
	}

	async fetchBookings(dto: FetchManyDto) {
		const BOOKING_FIELD_MAP: Record<string, string> = {
			createdAt: "created_at",
			updatedAt: "updated_at",
			slotTitle: "slot_title",
			slotStartsAt: "slot_starts_at",
			slotId: "slot_mongo_id",
			clientName: "client_name",
			clientEmail: "client_email",
		};

		const conditions: string[] = ["1=1"];
		const queryParams: Record<string, any> = {};
		let paramIdx = 0;

		if (dto.columnFilters) {
			for (const f of dto.columnFilters) {
				if (f.id === "status" && f.value) {
					const key = `p${paramIdx++}`;
					conditions.push(`status = {${key}:String}`);
					queryParams[key] = f.value[0];
				} else if (f.id === "clientEmail" && f.value) {
					const key = `p${paramIdx++}`;
					conditions.push(`client_email LIKE {${key}:String}`);
					queryParams[key] = `%${f.value}%`;
				}
			}
		}
		if (dto.dateRange) {
			const field =
				dto.dateRange.field === "created_at" ? "created_at" : "slot_starts_at";
			const keyFrom = `p${paramIdx++}`;
			const keyTo = `p${paramIdx++}`;
			conditions.push(`${field} >= {${keyFrom}:DateTime}`);
			conditions.push(`${field} <= {${keyTo}:DateTime}`);
			queryParams[keyFrom] = dto.dateRange.from;
			queryParams[keyTo] = dto.dateRange.to;
		}

		const where = conditions.join(" AND ");

		const orderBy = dto.sorting?.length
			? dto.sorting
					.map(
						(s) =>
							`${BOOKING_FIELD_MAP[s.id] || s.id} ${s.desc ? "DESC" : "ASC"}`,
					)
					.join(", ")
			: "created_at DESC";

		const countQuery = `SELECT count() AS total FROM booking_app.bookings FINAL WHERE ${where}`;
		const countResult = await this.chClient.query({
			query: countQuery,
			query_params: queryParams,
		});
		const totalCount = ((await countResult.json()) as any).data[0].total;

		const offset = dto.pageIndex * dto.pageSize;
		const dataQuery = `SELECT * FROM booking_app.bookings FINAL WHERE ${where} ORDER BY ${orderBy} LIMIT {limit:UInt32} OFFSET {offset:UInt32}`;
		const dataResult = await this.chClient.query({
			query: dataQuery,
			query_params: { ...queryParams, limit: dto.pageSize, offset },
		});
		const rows = ((await dataResult.json()) as any).data;

		const data = rows.map((row: any) => ({
			mongoId: row.mongo_id,
			slotId: row.slot_mongo_id,
			slotTitle: row.slot_title,
			slotStartsAt: row.slot_starts_at,
			clientName: row.client_name,
			clientEmail: row.client_email,
			status: row.status,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));

		return { data, totalCount: Number(totalCount) };
	}
}

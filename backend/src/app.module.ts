import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { SlotsModule } from "./slots/slots.module";

function loadConfig() {
	const env = process.env.APP_ENV || "dev";
	switch (env) {
		case "docker":
			return require("./config/docker.config").default;
		case "prod":
			return require("./config/prod.config").default;
		case "dev":
		default:
			return require("./config/dev.config").default;
	}
}

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [loadConfig()],
			isGlobal: true,
		}),
		ScheduleModule.forRoot(),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				uri: config.get<string>("mongoUrl"),
			}),
		}),
		AuthModule,
		SlotsModule,
		BookingsModule,
	],
})
export class AppModule {}

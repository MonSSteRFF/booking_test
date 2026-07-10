import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationExceptionFilter } from "./api/validation-exception.filter";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableCors();
	app.setGlobalPrefix("api");
	app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
	app.useGlobalFilters(new ValidationExceptionFilter());

	const config = new DocumentBuilder()
		.setTitle("Slot Booking API")
		.setDescription(
			"Mini-system for booking slots with CQRS (Mongo + ClickHouse)",
		)
		.setVersion("3.0")
		.addBearerAuth()
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api/docs", app, document);

	await app.listen(3000);
}
bootstrap();

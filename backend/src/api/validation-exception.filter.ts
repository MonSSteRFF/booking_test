import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	BadRequestException,
} from "@nestjs/common";
import type { Response } from "express";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
	catch(exception: BadRequestException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const status = exception.getStatus();
		const exceptionResponse = exception.getResponse();

		let fieldErrors: { field: string; message: string }[] = [];

		if (
			typeof exceptionResponse === "object" &&
			exceptionResponse !== null &&
			"message" in exceptionResponse
		) {
			const messages = (exceptionResponse as any).message;
			if (Array.isArray(messages)) {
				fieldErrors = messages.map((msg: string) => {
					const match = msg.match(/^(\w+)\s/);
					return {
						field: match ? match[1] : "unknown",
						message: msg,
					};
				});
			}
		}

		response.status(status).json({
			statusCode: status,
			message: "Validation failed",
			details: {
				field_errors: fieldErrors,
			},
		});
	}
}

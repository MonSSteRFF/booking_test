interface ApiError {
	statusCode?: number;
	message?: string;
	details?: {
		code?: string;
		field_errors?: Array<{ field: string; message: string }>;
	};
}

const BOOKING_ERROR_MESSAGES: Record<string, string> = {
	SLOT_FULL: "Слот заполнен, свободных мест нет",
	SLOT_INACTIVE: "Слот деактивирован",
	ALREADY_BOOKED: "У вас уже есть активная бронь на этот слот",
	CAPACITY_BELOW_BOOKED: "Новая вместимость меньше текущего числа броней",
};

function isApiError(err: unknown): err is ApiError {
	return typeof err === "object" && err !== null && "statusCode" in err;
}

export function getFieldErrors(err: unknown): Array<{ field: string; message: string }> {
	if (!isApiError(err)) return [];
	return err.details?.field_errors ?? [];
}

export function getBookingErrorCode(err: unknown): string | null {
	if (!isApiError(err)) return null;
	return err.details?.code ?? null;
}

export function getErrorMessage(err: unknown): string {
	if (isApiError(err)) {
		const code = err.details?.code;
		if (code && code in BOOKING_ERROR_MESSAGES) return BOOKING_ERROR_MESSAGES[code];
		if (err.message) return err.message;
	}
	console.error(err);
	return "unknown error";
}

export interface Slot {
	mongoId: string;
	title: string;
	startsAt: string;
	capacity: number;
	bookedCount: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Booking {
	mongoId: string;
	slotId: string;
	slotTitle: string;
	slotStartsAt: string;
	clientName: string;
	clientEmail: string;
	status: "ACTIVE" | "CANCELLED";
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	totalCount: number;
}

export interface FetchManyParams {
	pageIndex: number;
	pageSize: number;
	sorting: { id: string; desc: boolean }[];
	columnFilters: { id: string; value: any; filterFn: string }[];
	dateRange?: {
		from: string;
		to: string;
		field: string;
		timezone?: string;
	};
}

export interface FieldError {
	field: string;
	message: string;
}

export interface ApiError {
	statusCode: number;
	message: string;
	details?: {
		code?: string;
		field_errors?: FieldError[];
	};
}

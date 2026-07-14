import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class SortingDto {
	@ApiProperty({ description: "Field to sort by" })
	@IsString()
	id: string;

	@ApiProperty({ description: "Sort direction", required: false })
	@IsOptional()
	desc?: boolean;
}

class ColumnFilterDto {
	@ApiProperty({ description: "Filter field ID" })
	@IsString()
	id: string;

	@ApiProperty({ description: "Filter value(s)" })
	@IsString()
	value: string;

	@ApiProperty({ description: "Filter function (in, contains)" })
	@IsString()
	filterFn: string;
}

class DateRangeDto {
	@ApiProperty({ description: "Start date (ISO 8601)" })
	@IsISO8601()
	@IsNotEmpty()
	from: string;

	@ApiProperty({ description: "End date (ISO 8601)" })
	@IsISO8601()
	@IsNotEmpty()
	to: string;

	@ApiProperty({ description: "Date field name" })
	@IsString()
	field: string;

	@ApiProperty({ description: "Timezone", required: false })
	@IsOptional()
	@IsString()
	timezone?: string;
}

export class FetchManySlotsDto {
	@ApiProperty({ description: "Page index (0-based)" })
	@Type(() => Number)
	@IsInt()
	@Min(0)
	pageIndex: number;

	@ApiProperty({ description: "Page size" })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	pageSize: number;

	@ApiProperty({ description: "Sorting configuration", type: [SortingDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SortingDto)
	sorting: SortingDto[];

	@ApiProperty({ description: "Column filters", type: [ColumnFilterDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ColumnFilterDto)
	columnFilters: ColumnFilterDto[];

	@ApiProperty({ description: "Date range filter", required: false })
	@IsOptional()
	@ValidateNested()
	@Type(() => DateRangeDto)
	dateRange?: DateRangeDto;
}

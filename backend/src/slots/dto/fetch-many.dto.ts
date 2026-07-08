import { IsInt, Min, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class SortingDto {
  @IsString() id: string;
  @IsOptional() desc?: boolean;
}

class ColumnFilterDto {
  @IsString() id: string;
  value: any;
  @IsString() filterFn: string;
}

class DateRangeDto {
  @IsString() from: string;
  @IsString() to: string;
  @IsString() field: string;
  @IsOptional() @IsString() timezone?: string;
}

export class FetchManyDto {
  @IsInt()
  @Min(0)
  pageIndex: number;

  @IsInt()
  @Min(1)
  pageSize: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortingDto)
  sorting: SortingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnFilterDto)
  columnFilters: ColumnFilterDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}
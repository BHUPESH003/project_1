import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoryStatus } from '@repo/types';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  iconPath?: string;
}

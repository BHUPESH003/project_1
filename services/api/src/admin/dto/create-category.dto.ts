import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoryStatus } from '@repo/types';

export class CreateCategoryDto {
  /** Slug-style ID, e.g. "printing", "stationery" */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'id must be lowercase alphanumeric with hyphens only',
  })
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus = CategoryStatus.COMING_SOON;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @IsOptional()
  @IsString()
  iconPath?: string;
}

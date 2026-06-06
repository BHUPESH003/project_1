import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminSellerDto {
  @ApiPropertyOptional({ example: 'Fast Print Hub' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  shopName?: string;

  @ApiPropertyOptional({ example: '12 MG Road, Bengaluru' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ description: 'Force seller status (ONLINE/OFFLINE)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Mark as trending (featured in discovery)',
  })
  @IsBoolean()
  @IsOptional()
  isTrending?: boolean;
}

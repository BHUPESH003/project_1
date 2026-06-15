import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BankDetailsDto {
  @ApiProperty({ description: 'Account holder name', example: 'Raj Kumar' })
  @IsString()
  @MaxLength(120)
  accountHolder!: string;

  @ApiProperty({ description: 'Bank account number', example: '123456789012' })
  @IsString()
  @MaxLength(34)
  accountNumber!: string;

  @ApiProperty({ description: 'IFSC code', example: 'HDFC0001234' })
  @IsString()
  @MaxLength(20)
  ifscCode!: string;
}

/**
 * Create Payout (withdrawal) Request DTO
 */
export class CreatePayoutDto {
  @ApiProperty({
    description: 'Amount to withdraw in rupees',
    example: 1500,
  })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Bank account details for the payout' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPayoutDto {
  @ApiProperty({ description: 'Reason for rejecting the payout request' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

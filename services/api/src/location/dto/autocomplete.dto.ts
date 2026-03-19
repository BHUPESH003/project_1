import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AutocompleteQueryDto {
  @ApiProperty({ description: 'The location search query (minimum 3 characters)' })
  @IsString()
  query!: string;
}

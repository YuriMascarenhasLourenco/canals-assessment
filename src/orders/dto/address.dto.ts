import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { address } from '../interface/address.interface';

export class AddressDto implements address {
  @ApiProperty({
    description: 'The first line of the address',
    example: '123 Main St',
  })
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @ApiProperty({
    description: 'The second line of the address (optional)',
    example: 'Apt 4B',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  line2!: string;

  @ApiProperty({
    description: 'The city of the address',
    example: 'Anytown',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({
    description: 'The state or province of the address',
    example: 'CA',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({
    description: 'The postal code of the address',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({
    description: 'The country of the address',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;
}

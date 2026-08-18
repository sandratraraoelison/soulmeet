import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Gender, InterestGender, SexualOrientation } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProfileDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @ApiProperty({ example: '1995-06-15' }) @IsDateString() birthDate!: string;
  @ApiProperty({ enum: [Gender.MALE, Gender.FEMALE, Gender.NON_GENDERED] })
  @IsIn([Gender.MALE, Gender.FEMALE, Gender.NON_GENDERED])
  gender!: Gender;
  @ApiProperty({ enum: SexualOrientation })
  @IsEnum(SexualOrientation)
  sexualOrientation!: SexualOrientation;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) country!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) city!: string;
  @ApiProperty({ required: false, example: 'Software engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;
  @ApiProperty({ enum: InterestGender, required: false })
  @IsOptional()
  @IsEnum(InterestGender)
  interestedInGender?: InterestGender;
}
export class UpdateProfileDto extends PartialType(CreateProfileDto) {}

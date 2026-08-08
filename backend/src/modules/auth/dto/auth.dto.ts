import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsEmail,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @ApiProperty({ example: '1995-06-15', format: 'date' })
  @IsDateString({ strict: true })
  birthDate!: string;
  @ApiProperty({ enum: [Gender.MALE, Gender.FEMALE, Gender.NON_GENDERED] })
  @IsIn([Gender.MALE, Gender.FEMALE, Gender.NON_GENDERED])
  gender!: Gender;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) country!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) location!: string;
}
export class LoginDto {
  @ApiProperty({ example: 'jane@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password!: string;
}
export class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
export class LogoutDto {
  @ApiProperty() @IsString() refreshToken!: string;
}
export class ExternalAuthDto {
  @ApiProperty({ description: 'OIDC identity token returned by the provider' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;
}

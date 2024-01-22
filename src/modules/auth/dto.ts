import { IsEmail, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class AccountDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AccountChangePasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ProfileUpdateDto {
  @IsOptional()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  @IsNumber()
  gender: number;

  @IsOptional()
  @IsString()
  birthday: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  degree: string;

  @IsOptional()
  @IsString()
  experience: string;

  @IsOptional()
  @IsString()
  job: string;

  @IsOptional()
  @IsString()
  numberId: string;

  @IsOptional()
  @IsString()
  fullNameRelative: string;

  @IsOptional()
  @IsString()
  phoneRelative: string;

  @IsOptional()
  @IsString()
  addressRelative: string;
}

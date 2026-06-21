import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Văn A' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @Matches(/^(0[3|5|7|8|9])\d{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiPropertyOptional({ example: 'user@vnchain.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: '0912345678 hoặc user@vnchain.vn' })
  @IsString()
  phoneOrEmail: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}

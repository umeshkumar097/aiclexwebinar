import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/validators/match.validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received via email' })
  @IsString()
  @MinLength(10)
  token!: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password!: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword!: string;
}

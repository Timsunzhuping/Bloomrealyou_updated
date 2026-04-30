import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginBody {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(200)
  password!: string;
}

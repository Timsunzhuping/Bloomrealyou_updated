import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveDesignBody {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;
}

export class RejectDesignBody {
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;
}

export class RequestRevisionBody {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;
}

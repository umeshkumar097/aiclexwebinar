import { IsArray, IsBoolean, IsEnum, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WebinarMode } from '../entities/webinar.entity';

export class WebinarSettingsDto {
  @IsOptional() @IsBoolean() requireRegistration?: boolean;
  @IsOptional() @IsBoolean() enableChat?: boolean;
  @IsOptional() @IsBoolean() enablePolls?: boolean;
  @IsOptional() @IsBoolean() enableOffers?: boolean;
  @IsOptional() @IsBoolean() repeat?: boolean;
  @IsOptional() @IsBoolean() privateWebinar?: boolean;
  @IsOptional() @IsBoolean() requireLogin?: boolean;
  @IsOptional() @IsBoolean() waitingRoom?: boolean;
  @IsOptional() @IsBoolean() enableWatermark?: boolean;
  @IsOptional() @IsBoolean() showLiveCount?: boolean;
  @IsOptional() @IsBoolean() enableRecording?: boolean;
  @IsOptional() @IsString() timezone?: string;
}

export class CreateWebinarDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WebinarMode)
  mode?: WebinarMode;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxAttendees?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;

  /** Semi-Live: pre-recorded video URL (MP4 direct link or YouTube embed URL) */
  @IsOptional()
  @IsString()
  videoUrl?: string;

  /** Semi-Live: timed events [{timeSeconds, type, data}] */
  @IsOptional()
  @IsArray()
  timedEvents?: Array<{ timeSeconds: number; type: string; data: Record<string, unknown> }>;

  @IsOptional()
  @IsString()
  replayUrl?: string;

  /** All feature toggles stored as JSONB */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebinarSettingsDto)
  settings?: WebinarSettingsDto;
}

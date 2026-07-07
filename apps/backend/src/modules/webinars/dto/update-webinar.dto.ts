import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWebinarDto } from './create-webinar.dto';
import { WebinarStatus } from '../entities/webinar.entity';

export class UpdateWebinarDto extends PartialType(CreateWebinarDto) {
  @IsOptional()
  @IsEnum(WebinarStatus)
  status?: WebinarStatus;
}

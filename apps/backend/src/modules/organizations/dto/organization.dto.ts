import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export enum OrgMemberRole {
  ADMIN = 'org_admin',
  HOST = 'host',
  MODERATOR = 'moderator',
  MEMBER = 'registered_user',
}

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: OrgMemberRole })
  @IsEnum(OrgMemberRole)
  role!: OrgMemberRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgMemberRole })
  @IsEnum(OrgMemberRole)
  role!: OrgMemberRole;
}

export class SwitchOrgDto {
  @ApiProperty()
  @IsString()
  organizationId!: string;
}

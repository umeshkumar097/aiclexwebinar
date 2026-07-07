import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown',
}

@Entity('device_sessions')
@Index(['refreshTokenHash'], { unique: true })
@Index(['userId'])
export class DeviceSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  /**
   * bcrypt hash of the opaque refresh token.
   * The actual token is sent to the client; we only store the hash.
   */
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, unique: true })
  refreshTokenHash!: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName!: string | null;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
  })
  deviceType!: DeviceType;

  @Column({ name: 'browser', type: 'varchar', length: 500, nullable: true })
  browser!: string | null;

  @Column({ name: 'os', type: 'varchar', length: 500, nullable: true })
  os!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.deviceSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  get isActive(): boolean {
    return this.revokedAt === null;
  }
}

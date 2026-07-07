import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { User } from './user.entity';

/**
 * Stores the bcrypt password hash.
 * NEVER returned in API responses.
 * Separated from users table for security isolation.
 */
@Entity('user_credentials')
export class UserCredential extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: false })
  userId!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false })
  passwordHash!: string;

  @OneToOne(() => User, (user) => user.credential)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

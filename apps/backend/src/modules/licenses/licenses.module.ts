import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './entities/license.entity';

@Module({
  imports: [TypeOrmModule.forFeature([License])],
  exports: [TypeOrmModule],
})
export class LicensesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { FeatureFlagOverride } from './entities/feature-flag-override.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag, FeatureFlagOverride])],
  exports: [TypeOrmModule],
})
export class FeatureFlagsModule {}

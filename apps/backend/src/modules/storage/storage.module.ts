import { Module, Global } from '@nestjs/common';
import { R2Service } from './r2.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [R2Service, StorageService],
  exports: [R2Service, StorageService],
})
export class StorageModule {}


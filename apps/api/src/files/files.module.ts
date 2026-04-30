import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';

import { FilesService } from './files.service';

@Module({
  imports: [StorageModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

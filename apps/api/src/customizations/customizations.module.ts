import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';

import { CustomizationsController } from './customizations.controller';
import { CustomizationsRepository } from './customizations.repository';
import { CustomizationsService } from './customizations.service';

@Module({
  imports: [FilesModule],
  controllers: [CustomizationsController],
  providers: [CustomizationsRepository, CustomizationsService],
  exports: [CustomizationsService, CustomizationsRepository],
})
export class CustomizationsModule {}

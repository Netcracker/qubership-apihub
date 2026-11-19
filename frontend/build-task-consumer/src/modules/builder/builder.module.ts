import { Module } from '@nestjs/common'

import { RegistryModule } from '../registry/registry.module'
import { BuilderService } from './builder.service'

@Module({
  imports: [
    RegistryModule
  ],
  providers: [BuilderService],
})
export class BuilderModule {}

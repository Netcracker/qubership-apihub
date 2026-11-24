import { Module } from '@nestjs/common'
import { RegistryService } from './registry.service'
import { HttpModule } from '@nestjs/axios'
import https from 'https'
import { v4 as uuidv4 } from 'uuid'

const BuilderIdProvider = {
  provide: 'builderId',
  useValue: uuidv4(),
}

@Module({
  imports: [
    HttpModule.register({
      timeout: 0, // required to disable timeout for migration case with heavy load
      maxRedirects: 5,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    }),
  ],
  providers: [BuilderIdProvider, RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}

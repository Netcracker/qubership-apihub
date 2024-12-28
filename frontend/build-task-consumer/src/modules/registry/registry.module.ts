/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Module } from '@nestjs/common'
import { RegistryService } from './registry.service'
import { HttpModule } from '@nestjs/axios'
import https from 'https'
import crypto from 'crypto'

const BuilderIdProvider = {
  provide: 'builderId',
  useValue: crypto.randomUUID(),
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

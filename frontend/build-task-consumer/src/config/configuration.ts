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

import { ConfigFactory } from '@nestjs/config/dist/interfaces'
import { config } from 'dotenv'

import { Configuration } from './configuration.interface'
import * as process from 'node:process'

config()

const configuration: Configuration = {
  apihubUrl: process.env.APIHUB_BACKEND_ADDRESS ?? '',
  apiKey: process.env.APIHUB_API_KEY ?? '',
  statusInterval: Number(process.env.JOB_STATUS_INTERVAL ?? '5000'),
  requestInterval: Number(process.env.JOB_REQUEST_INTERVAL ?? '3000'),
  operationsBatch: Number(process.env.OPERATIONS_BUILD_BATCH ?? '16'),
}

const configFunction: ConfigFactory<Configuration> = () => configuration
export default configFunction

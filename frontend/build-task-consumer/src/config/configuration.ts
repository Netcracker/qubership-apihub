import { ConfigFactory } from '@nestjs/config'
import { config } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import * as process from 'node:process'

import { Configuration } from './configuration.interface'

config()

function readApiKey(): string {
  const apiKeyFile = process.env.APIHUB_API_KEY_FILE
  if (apiKeyFile && existsSync(apiKeyFile)) {
    return readFileSync(apiKeyFile, 'utf8').trim()
  }
  return process.env.APIHUB_API_KEY ?? ''
}

const configuration: Configuration = {
  apihubUrl: process.env.APIHUB_BACKEND_ADDRESS ?? '',
  apiKey: readApiKey(),
  statusInterval: Number(process.env.JOB_STATUS_INTERVAL ?? '5000'),
  requestInterval: Number(process.env.JOB_REQUEST_INTERVAL ?? '3000'),
  operationsBatch: Number(process.env.OPERATIONS_BUILD_BATCH ?? '16'),
}

const configFunction: ConfigFactory<Configuration> = () => configuration
export default configFunction

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module'
import { ApihubLogger, redirectConsoleToLogger } from './utils/logger'

const BODY_LIMIT = '50mb'

async function bootstrap() {
  const port = process.env.port || 3000
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new ApihubLogger() })
  redirectConsoleToLogger()

  app.useBodyParser('json', { limit: BODY_LIMIT })
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true })
  app.enableCors()

  await app.listen(port)
}
bootstrap()

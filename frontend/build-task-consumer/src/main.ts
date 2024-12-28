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

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestFactory } from '@nestjs/core'
import * as bodyParser from 'body-parser'

import { AppModule } from './app.module'

async function bootstrap() {
  const port = process.env.port || 3000
  const app = await NestFactory.create(AppModule)

  const config = new DocumentBuilder()
    .setTitle('APIHUB Node Service API')
    .setDescription('The API contract for APIHUB NodeJs service')
    .setVersion('0.1.0')
    .addTag('compare', 'Compare methods')
    .addTag('validate', 'Validate methods')
    .addServer('http://localhost:3000', 'Local server')
    .setExternalDoc('Find out more about project', 'https://example.com/APIHUB')
    .build();
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('swagger', app, document)

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
  app.enableCors()

  await app.listen(port)
}
bootstrap()

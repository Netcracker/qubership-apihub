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

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { MockHttpService } from './helpers/httpService'
import { createPublishPayload } from './helpers/agent'
import { AppModule } from '../src/app.module'

describe('Publish Controller (e2e)', () => {
  let app: INestApplication
  const httpService = new MockHttpService()

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test
      .createTestingModule({ imports: [AppModule] })
      .overrideProvider(HttpService)
      .useValue(httpService.clear())
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('om-tmf641-integration-service package should be published', async () => {
    const { config, sources } = await createPublishPayload("om-tmf641-integration-service")
    const headers = { 'api-key': "foobar" }
    const buildId = "123"

    /*await request(app.getHttpServer())
      .post(`/v1/build/${buildId}`)
      .set(headers)
      .type('form')
      .field('config', JSON.stringify(config))
      .attach('sources', sources, { filename: "sources.zip", contentType: "application/zip" })
      .expect(202)

    const result = await httpService.buildStatus()*/
    /*expect(result).toMatchObject({ buildId, headers, packageId: config.packageId })

    const formData = parseFormData(result.data)
    expect(formData).toMatchObject({
      status: BuildStatus.COMPLETE,
      data: {}
    })*/
    // TODO: unzip formData.data.data and validate
  })

  afterAll(async () => {
    await app.close()
  })

})

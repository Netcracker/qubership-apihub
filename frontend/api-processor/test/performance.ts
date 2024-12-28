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

import { LocalRegistry } from './helpers'
import { VERSION_STATUS } from '../src'

const portal = new LocalRegistry('performance')

await portal.publish('performance', {
    packageId: 'performance',
    version: 'v1',
    status: VERSION_STATUS.RELEASE,
    files: [
        { fileId: '2023.3/openapi_large_x1.yaml' },
        { fileId: '2023.3/openapi_large_x2.yaml' },
        { fileId: '2023.3/openapi_large_x4.yaml' },
        { fileId: '2023.3/openapi_large_x6.yaml' },
    ],
})

await portal.publish('performance', {
    packageId: 'performance',
    version: 'v2',
    previousVersion: 'v1',
    status: VERSION_STATUS.RELEASE,
    files: [
        // todo replace with modified files
        { fileId: '2024.1/openapi_large_x1.yaml' },
        { fileId: '2024.1/openapi_large_x2.yaml' },
        { fileId: '2024.1/openapi_large_x4.yaml' },
        { fileId: '2024.1/openapi_large_x6.yaml' },
    ],
})
console.log('DONE')
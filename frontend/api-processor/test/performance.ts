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

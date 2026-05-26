import type { Router } from 'express'
import { Router as createRouter } from 'express'

import { MAGIC_EXPIRED_FILE_ID, MAGIC_MISSING_FILE_ID, MOCK_FILE_DOWNLOAD_TOKEN } from '../../mocks/ai-chat/constants'
import { MOCK_ATTACHMENT_FILE_ID } from '../../mocks/ai-chat/ephemeralFileUrl'
import { sendError } from '../ai-chat/errors'

const DUMMY_CSV = `operation,method,path,package,version
listCustomers,GET,/api/v1/customers,Customers,2024.4
createCustomer,POST,/api/v1/customers,Customers,2024.4
listOrders,GET,/api/v1/orders,Orders,2024.3
`

const DUMMY_MARKDOWN = `# Operations Report

| Method | Path | Package |
| --- | --- | --- |
| GET | /api/v1/customers | Customers@2024.4 |
| POST | /api/v1/customers | Customers@2024.4 |
| GET | /api/v1/orders | Orders@2024.3 |
`

function isValidToken(token: string): boolean {
  if (token === MOCK_FILE_DOWNLOAD_TOKEN) return true
  if (token.startsWith('mock-')) return true
  return false
}

export function EphemeralFilesRouter(): Router {
  const router = createRouter()

  router.get('/:fileId', (req, res) => {
    const { fileId } = req.params
    const token = typeof req.query.token === 'string' ? req.query.token : ''

    if (fileId === MAGIC_MISSING_FILE_ID) {
      sendError(res, 404, 'APIHUB-EF-3001', 'ephemeral file with fileId = $fileId not found')
      return
    }
    if (fileId === MAGIC_EXPIRED_FILE_ID) {
      sendError(res, 410, 'APIHUB-EF-4101', 'download token expired, please request the file again')
      return
    }
    if (!token) {
      sendError(res, 401, 'APIHUB-EF-3003', 'Missing token query parameter')
      return
    }
    if (!isValidToken(token)) {
      sendError(res, 401, 'APIHUB-EF-3002', 'Invalid download token')
      return
    }

    if (fileId === MOCK_ATTACHMENT_FILE_ID) {
      res
        .status(200)
        .type('text/markdown')
        .setHeader('Content-Disposition', 'attachment; filename="export-sample.md"')
        .send(DUMMY_MARKDOWN)
      return
    }
    res
      .status(200)
      .type('text/csv')
      .setHeader('Content-Disposition', `attachment; filename="${fileId}.csv"`)
      .send(DUMMY_CSV)
  })

  return router
}

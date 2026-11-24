import type { ErrorStatus } from './requests'

export class HttpError extends Error {
  code: string
  status: ErrorStatus

  constructor(message: string, code: string, status: ErrorStatus) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.status = status
  }
}

import type { ErrorStatus } from './requests'

export class HttpError extends Error {
  code: string
  status: ErrorStatus
  params?: Readonly<Record<string, string>>

  constructor(message: string, code: string, status: ErrorStatus, params?: Readonly<Record<string, string>>) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.status = status
    this.params = params
  }
}

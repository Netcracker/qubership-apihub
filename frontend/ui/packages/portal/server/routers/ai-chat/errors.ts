import type { Response } from 'express'
import type { AiChatErrorCode, AiChatErrorResponse } from '../../mocks/ai-chat/types'

export function sendError(
  res: Response,
  status: number,
  code: AiChatErrorCode,
  message: string,
): void {
  const body: AiChatErrorResponse = { status, code, message }
  res.status(status).json(body)
}

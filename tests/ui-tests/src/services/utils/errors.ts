import { type APIResponse } from '@playwright/test'
import { getResponseDebugMsg } from './rest'

export const stringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  } else {
    const msg = String(error)
    try {
      return JSON.parse(msg)
    } catch (error) {
      return msg
    }
  }
}

export const getRestFailMsg = async (message: string, response: APIResponse): Promise<string> => {
  return `${message} has been failed\n${await getResponseDebugMsg(response)}`
}

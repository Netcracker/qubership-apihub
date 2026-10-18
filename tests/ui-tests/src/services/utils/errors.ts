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

export const getRestFailMsg = async (message: string, response?: APIResponse): Promise<string> => {
  let resultMessage = `${message} has been failed`
  if (response) {
    resultMessage += `\n${await getResponseDebugMsg(response)}`
  }
  return resultMessage
}

export const handlePlaywrightError = (error: unknown, message: string): void => {
  // Add component context to the error message
  const originalMessage = error instanceof Error ? error.message : String(error)
  const contextualMessage = `${message}: ${originalMessage}`

  // Create a new error with the enhanced message but preserve the stack trace
  const enhancedError = new Error(contextualMessage)
  if (error instanceof Error) {
    enhancedError.stack = error.stack
    enhancedError.name = error.name
    // Copy any additional properties from the original error
    Object.assign(enhancedError, error)
  }

  throw enhancedError
}

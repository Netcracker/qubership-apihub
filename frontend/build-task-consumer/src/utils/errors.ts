export type ResponseError = Readonly<{
  code: string
  message: string
  params?: {[key: string]: string}
  status: string
}>

export function getResponseError(error: ResponseError | null): string | null {
  if (!error) {
    return null
  }

  let errorMessage = error?.message ?? JSON.stringify(error)
  error?.params && Object.entries(error?.params).forEach(([key, value]) => {
    errorMessage = errorMessage.replace(`$${key}`, value)
  })
  return errorMessage
}

export function handleServerError(error: unknown): void {
  const errorResponseData = (error as any)?.response?.data
  console.error(
    'Got an error from either server or builder',
    getResponseError(errorResponseData) ?? error,
  )

  errorResponseData?.debug && console.log('Found debug message: ', errorResponseData.debug)
}

import { bypass, HttpResponse, type JsonBodyType } from 'msw'

// Sends the request to the backend past the mocks and returns the real status with the body that `patch` makes of the
// real one. A response that is not OK is returned as the backend sent it.
export async function patchJsonResponse<T extends JsonBodyType>(
  request: Request,
  patch: (data: T) => T,
): Promise<Response> {
  const response = await fetch(bypass(request))
  if (!response.ok) {
    return response
  }
  return HttpResponse.json<T>(patch(await response.json()), { status: response.status })
}

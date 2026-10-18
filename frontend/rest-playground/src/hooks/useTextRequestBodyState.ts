import * as React from 'react'
import { useGenerateExampleFromMediaTypeContent } from '../utils/exampleGeneration/exampleGeneration'
import { IMediaTypeContent } from '@stoplight/types'

/**
 * Manages the state of the request or response body text editor.
 *
 * A wrapper for `React.useState`, but handles creating the initial value, and resetting when the content definition changes.
 */

export const useTextRequestResponseBodyState = (options: {
  mediaTypeContent: IMediaTypeContent | undefined;
  skipReadOnly: boolean;
  skipWriteOnly: boolean;
}): [string, React.Dispatch<React.SetStateAction<string>>] => {
  const { mediaTypeContent, skipReadOnly, skipWriteOnly } = options
  const initialRequestResponseBody = useGenerateExampleFromMediaTypeContent(mediaTypeContent, {
    skipReadOnly: skipReadOnly,
    skipWriteOnly: skipWriteOnly,
  })

  const [textRequestResponseBody, setTextRequestResponseBody] = React.useState<string>(initialRequestResponseBody)

  React.useEffect(() => {
    setTextRequestResponseBody(initialRequestResponseBody)
  }, [initialRequestResponseBody])

  return [textRequestResponseBody, setTextRequestResponseBody]
}

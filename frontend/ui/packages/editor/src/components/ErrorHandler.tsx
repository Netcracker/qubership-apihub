/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC, PropsWithChildren, ReactElement } from 'react'
import { memo, useEffect } from 'react'
import { editorRequestVoid } from '../utils/requests'

export const ErrorHandler: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  useEffect(() => {
    const errorHandler = async ({ error }: ErrorEvent): Promise<void> => {
      // showErrorNotification({title: 'Error', message: message})
      await storeLogs(error)
    }
    window.addEventListener('error', errorHandler)
    return () => window.removeEventListener('error', errorHandler)
  }, [])

  return children as ReactElement
})

async function storeLogs(
  error: Error,
): Promise<void> {
  const data = {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    cause: error?.cause,
    url: document.location.href,
  }

  await editorRequestVoid('/debug/logs', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

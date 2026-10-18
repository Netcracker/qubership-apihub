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

import type { FC, ReactElement } from 'react'
import { memo, useState } from 'react'
import { useEvent } from 'react-use'

export type PopupDelegateProps = {
  type: string
  render: (props: PopupProps) => ReactElement
}

export type PopupProps = {
  open: boolean
  setOpen: (value: boolean) => void
  detail?: Detail
}

export const PopupDelegate: FC<PopupDelegateProps> = memo<PopupDelegateProps>(({ type, render }) => {
  const [open, setOpen] = useState<boolean>(false)
  const [detail, setDetail] = useState<Detail>()

  useEvent(type, ({ detail }: CustomEvent<Detail>): void => {
    setOpen(true)
    setDetail(detail)
  })

  if (open) {
    return render({ open, setOpen, detail })
  }

  return null
})

type Detail = Record<string, unknown>

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

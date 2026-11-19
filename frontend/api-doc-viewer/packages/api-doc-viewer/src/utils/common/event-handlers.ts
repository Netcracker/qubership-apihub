import { MouseEvent } from 'react'
import { ToggleContextMenuHandler } from '../../components/kit/ux/UxContextMenu/types/ToggleContextMenuHandler'

export function defaultOnContextMenu(
  isExpandable: boolean | undefined,
  onToggleContextMenu: ToggleContextMenuHandler
) {
  if (!isExpandable) {
    return undefined
  }
  return (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleContextMenu({ open: true })
  }
}
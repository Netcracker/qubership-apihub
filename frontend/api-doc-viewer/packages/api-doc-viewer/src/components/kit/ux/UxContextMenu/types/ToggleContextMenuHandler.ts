export type ToggleContextMenuHandlerOptions = {
  open: boolean
  x?: number
  y?: number
}

export type ToggleContextMenuHandler = (options: ToggleContextMenuHandlerOptions) => void
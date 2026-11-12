import {CONTEXT_MENU_X_LOCAL_STORAGE, CONTEXT_MENU_Y_LOCAL_STORAGE} from "../consts/localStorage";

export function setContextMenuCoordinates(x?: number, y?: number): void {
  if (!x && !y) {
    localStorage.removeItem(CONTEXT_MENU_X_LOCAL_STORAGE)
    localStorage.removeItem(CONTEXT_MENU_Y_LOCAL_STORAGE)
  } else {
    localStorage.setItem(CONTEXT_MENU_X_LOCAL_STORAGE, x ? `${x}px` : '')
    localStorage.setItem(CONTEXT_MENU_Y_LOCAL_STORAGE, y ? `${y + 10}px` : '')
  }
}

export function getContextMenuCoordinates(): {
  x?: string
  y?: string
} {
  return {
    x: localStorage.getItem(CONTEXT_MENU_X_LOCAL_STORAGE) || undefined,
    y: localStorage.getItem(CONTEXT_MENU_Y_LOCAL_STORAGE) || undefined,
  }
}
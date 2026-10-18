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
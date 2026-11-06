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
import type { FC } from 'react'
import { memo } from 'react'

export type GuideIconProps = {
  color?: string
}

/** Open book: used for guides (articles served by the docs extension), distinct from the document FileIcon. */
export const GuideIcon: FC<GuideIconProps> = memo<GuideIconProps>(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
           data-testid="GuideIcon">
        <path
          d="M10 5.25C8.95 4.1 7.3 3.5 5.5 3.5c-1.1 0-2.1.2-3 .55-.3.1-.5.4-.5.7V15.4c0 .5.5.85.95.7.95-.35 1.95-.5 3.05-.5 1.6 0 3.1.5 4 1.4.9-.9 2.4-1.4 4-1.4 1.1 0 2.1.15 3.05.5.45.15.95-.2.95-.7V4.75c0-.3-.2-.6-.5-.7-.9-.35-1.9-.55-3-.55-1.8 0-3.45.6-4.5 1.75Zm-.75 10.1c-1-.6-2.3-.95-3.75-.95-.8 0-1.55.1-2.25.3V5.3c.7-.2 1.45-.3 2.25-.3 1.5 0 2.85.5 3.75 1.3v9.05Zm1.5 0V6.3c.9-.8 2.25-1.3 3.75-1.3.8 0 1.55.1 2.25.3v9.4c-.7-.2-1.45-.3-2.25-.3-1.45 0-2.75.35-3.75.95Z"
          fill={color ?? '#8F9EB4'}
        />
      </svg>
    </div>
  )
})

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

export const VersionIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7.5 4.5C7.5 3.11929 8.61929 2 10 2C11.3807 2 12.5 3.11929 12.5 4.5C12.5 5.61942 11.7643 6.56699 10.75 6.88555V7.96483C10.75 8.65519 11.3096 9.21483 12 9.21483H14.0046C15.5234 9.21483 16.7546 10.4461 16.7546 11.9648V13.1159C17.7665 13.4359 18.5 14.3823 18.5 15.5C18.5 16.8807 17.3807 18 16 18C14.6193 18 13.5 16.8807 13.5 15.5C13.5 14.3789 14.238 13.4301 15.2546 13.113V11.9648C15.2546 11.2745 14.695 10.7148 14.0046 10.7148H12C11.5496 10.7148 11.1246 10.6066 10.7494 10.4147L10.7494 13.1143C11.764 13.4326 12.5 14.3804 12.5 15.5C12.5 16.8807 11.3807 18 10 18C8.61929 18 7.5 16.8807 7.5 15.5C7.5 14.3808 8.23543 13.4334 9.24939 13.1146L9.24938 10.415C8.87429 10.6067 8.44941 10.7148 7.99939 10.7148H5.99474C5.30438 10.7148 4.74474 11.2745 4.74474 11.9648V13.1128C5.76173 13.4297 6.5 14.3787 6.5 15.5C6.5 16.8807 5.38071 18 4 18C2.61929 18 1.5 16.8807 1.5 15.5C1.5 14.3825 2.23318 13.4363 3.24474 13.1161V11.9648C3.24474 10.4461 4.47595 9.21484 5.99474 9.21484H7.99939C8.67691 9.21484 9.22865 8.67599 9.24938 8.00404L9.24938 6.88535C8.23542 6.5666 7.5 5.61918 7.5 4.5ZM10 3.5C9.44772 3.5 9 3.94772 9 4.5C9 5.05228 9.44772 5.5 10 5.5C10.5523 5.5 11 5.05228 11 4.5C11 3.94772 10.5523 3.5 10 3.5ZM4 14.5C3.44772 14.5 3 14.9477 3 15.5C3 16.0523 3.44772 16.5 4 16.5C4.55228 16.5 5 16.0523 5 15.5C5 14.9477 4.55228 14.5 4 14.5ZM10 14.5C9.44772 14.5 9 14.9477 9 15.5C9 16.0523 9.44772 16.5 10 16.5C10.5523 16.5 11 16.0523 11 15.5C11 14.9477 10.5523 14.5 10 14.5ZM16 14.5C15.4477 14.5 15 14.9477 15 15.5C15 16.0523 15.4477 16.5 16 16.5C16.5523 16.5 17 16.0523 17 15.5C17 14.9477 16.5523 14.5 16 14.5Z"
          fill="#8F9EB4"
        />
      </svg>
    </div>
  )
})

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

export const ComponentIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="path-1-inside-1_68797_408263" fill="white">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7 3.5C7 2.11929 8.11929 1 9.5 1C10.8807 1 12 2.11929 12 3.5V4H14C15.6569 4 17 5.34315 17 7V9C18.1046 9 19 9.89543 19 11C19 12.1046 18.1046 13 17 13V15C17 16.6569 15.6569 18 14 18H11V17C11 16.4477 10.5523 16 10 16C9.44772 16 9 16.4477 9 17V18H5C3.34315 18 2 16.6569 2 15V12H4C4.55228 12 5 11.5523 5 11C5 10.4477 4.55228 10 4 10H2V7C2 5.34315 3.34315 4 5 4H7V3.5Z"
          />
        </mask>
        <path
          d="M12 4H10.5V5.5H12V4ZM17 9H15.5V10.5H17V9ZM17 13V11.5H15.5V13H17ZM11 18H9.5V19.5H11V18ZM9 18V19.5H10.5V18H9ZM2 12V10.5H0.5V12H2ZM2 10H0.5V11.5H2V10ZM7 4V5.5H8.5V4H7ZM9.5 -0.5C7.29086 -0.5 5.5 1.29086 5.5 3.5H8.5C8.5 2.94772 8.94772 2.5 9.5 2.5V-0.5ZM13.5 3.5C13.5 1.29086 11.7091 -0.5 9.5 -0.5V2.5C10.0523 2.5 10.5 2.94772 10.5 3.5H13.5ZM13.5 4V3.5H10.5V4H13.5ZM14 2.5H12V5.5H14V2.5ZM18.5 7C18.5 4.51472 16.4853 2.5 14 2.5V5.5C14.8284 5.5 15.5 6.17157 15.5 7H18.5ZM18.5 9V7H15.5V9H18.5ZM20.5 11C20.5 9.067 18.933 7.5 17 7.5V10.5C17.2761 10.5 17.5 10.7239 17.5 11H20.5ZM17 14.5C18.933 14.5 20.5 12.933 20.5 11H17.5C17.5 11.2761 17.2761 11.5 17 11.5V14.5ZM18.5 15V13H15.5V15H18.5ZM14 19.5C16.4853 19.5 18.5 17.4853 18.5 15H15.5C15.5 15.8284 14.8284 16.5 14 16.5V19.5ZM11 19.5H14V16.5H11V19.5ZM9.5 17V18H12.5V17H9.5ZM10 17.5C9.72386 17.5 9.5 17.2761 9.5 17H12.5C12.5 15.6193 11.3807 14.5 10 14.5V17.5ZM10.5 17C10.5 17.2761 10.2761 17.5 10 17.5V14.5C8.61929 14.5 7.5 15.6193 7.5 17H10.5ZM10.5 18V17H7.5V18H10.5ZM5 19.5H9V16.5H5V19.5ZM0.5 15C0.5 17.4853 2.51472 19.5 5 19.5V16.5C4.17157 16.5 3.5 15.8284 3.5 15H0.5ZM0.5 12V15H3.5V12H0.5ZM4 10.5H2V13.5H4V10.5ZM3.5 11C3.5 10.7239 3.72386 10.5 4 10.5V13.5C5.38071 13.5 6.5 12.3807 6.5 11H3.5ZM4 11.5C3.72386 11.5 3.5 11.2761 3.5 11H6.5C6.5 9.61929 5.38071 8.5 4 8.5V11.5ZM2 11.5H4V8.5H2V11.5ZM0.5 7V10H3.5V7H0.5ZM5 2.5C2.51472 2.5 0.5 4.51472 0.5 7H3.5C3.5 6.17157 4.17157 5.5 5 5.5V2.5ZM7 2.5H5V5.5H7V2.5ZM5.5 3.5V4H8.5V3.5H5.5Z"
          fill="#8F9EB4"
          mask="url(#path-1-inside-1_68797_408263)"
        />
      </svg>
    </div>
  )
})

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

export const DefaultSideBarIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_6440_174536)">
          <path
            d="M8.96066 8.42971C8.73728 7.84704 7.95173 7.84704 7.72835 8.42971L4.80952 16.0162H6.35456L8.34636 10.8425L9.88023 14.8274C10.0403 15.2419 10.4238 15.5157 10.8519 15.5157C11.1274 15.5157 11.3806 15.4023 11.5705 15.2145L8.96066 8.42971ZM8.34264 7.49118C8.81174 7.49118 9.22499 7.78447 9.40369 8.24201L11.8795 14.6788L12.6501 12.6727L10.7291 7.68279C10.3344 6.65432 9.39625 5.98952 8.34264 5.98952C7.28903 5.98952 6.35084 6.65432 5.9562 7.68279L2.75071 16.0123H4.29575L7.28531 8.2381C7.46029 7.78447 7.87727 7.49118 8.34264 7.49118ZM8.34264 5.48506C9.59356 5.48506 10.703 6.27108 11.1721 7.49118L12.907 12.0001L13.6777 9.99394L12.4975 6.92806C11.8087 5.13702 10.1781 3.9834 8.33892 3.9834C6.49976 3.9834 4.86909 5.14093 4.18034 6.92806L0.691895 16.0123H2.23694L5.51689 7.48727C5.98226 6.27108 7.09544 5.48506 8.34264 5.48506ZM16.2205 4.73032L12.2667 15.0112C12.0321 15.6173 11.4737 16.0123 10.8519 16.0123H13.3612C14.3329 16.0123 15.2116 15.3905 15.5727 14.4442L19.3106 4.73032H16.2205Z"
            fill="#626D82"/>
        </g>
        <defs>
          <clipPath id="clip0_6440_174536">
            <rect width="20" height="20" fill="white" transform="translate(0.000976562)"/>
          </clipPath>
        </defs>
      </svg>
    </div>
  )
})

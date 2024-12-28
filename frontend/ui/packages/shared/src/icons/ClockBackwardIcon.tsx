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

import type { SvgIconProps } from '@mui/material'
import { SvgIcon } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'

export const ClockBackwardIcon: FC<SvgIconProps> = memo((props: SvgIconProps) => {
  return (
    <SvgIcon viewBox="0 0 20 20" {...props}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9.24985 6C9.66406 6 9.99985 6.33579 9.99985 6.75V9.9849L12.7691 11.05C13.1557 11.1987 13.3485 11.6326 13.1999 12.0192C13.0512 12.4058 12.6172 12.5987 12.2306 12.45L8.98061 11.2C8.69097 11.0886 8.49985 10.8103 8.49985 10.5V6.75C8.49985 6.33579 8.83563 6 9.24985 6Z"
          fill="currentColor"
        />
        <path
          d="M9.99985 1.5C14.6943 1.5 18.4998 5.30558 18.4998 10C18.4998 14.6944 14.6943 18.5 9.99985 18.5C7.74453 18.5 5.69436 17.6216 4.17277 16.1883C3.86102 15.8947 3.90378 15.3995 4.23626 15.1295C4.54782 14.8766 5.00036 14.9158 5.29758 15.1855C6.54019 16.313 8.18979 17 9.99985 17C13.8658 17 16.9998 13.866 16.9998 10C16.9998 6.13401 13.8658 3 9.99985 3C7.16807 3 4.72902 4.6815 3.62671 7.1005L2.36046 6.26871C3.74236 3.44474 6.64399 1.5 9.99985 1.5Z"
          fill="currentColor"
        />
        <path
          d="M1.9463 2.95652C2.35567 2.89336 2.73873 3.17402 2.80188 3.5834L3.22077 6.29858L5.94171 5.87884C6.35109 5.81569 6.73414 6.09635 6.79729 6.50572C6.86044 6.91509 6.57978 7.29815 6.17041 7.3613L2.70824 7.89539C2.29887 7.95854 1.91582 7.67788 1.85266 7.26851L1.31942 3.8121C1.25627 3.40273 1.53693 3.01967 1.9463 2.95652Z"
          fill="currentColor"
        />
      </svg>
    </SvgIcon>
  )
})

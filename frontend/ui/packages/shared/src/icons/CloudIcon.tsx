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

export const CloudIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4.10003 10.4822C4.10961 6.95576 6.9713 4.09998 10.5 4.09998C13.187 4.09998 15.4853 5.75537 16.4345 8.09998H17C20.2585 8.09998 22.9 10.7415 22.9 13.9999C22.9 17.2584 20.2585 19.9 17 19.9H6.00001C3.29381 19.9 1.10001 17.7062 1.10001 15C1.10001 12.9667 2.33822 11.2247 4.09819 10.483C4.0988 10.4827 4.09942 10.4825 4.10003 10.4822ZM10.5 5.89998C7.95949 5.89998 5.90001 7.95947 5.90001 10.5L5.90001 10.5117C5.90001 10.6043 5.90001 10.6935 5.89776 10.7664C5.89577 10.8311 5.89111 10.9537 5.85939 11.0825C5.83209 11.1933 5.78364 11.3578 5.67219 11.5257C5.56073 11.6936 5.428 11.8022 5.33645 11.8704C5.22799 11.9512 5.1124 12.0045 5.05419 12.031C4.98553 12.0623 4.89948 12.0986 4.80798 12.1372L4.79725 12.1417C3.6809 12.6122 2.90001 13.7159 2.90001 15C2.90001 16.7121 4.28792 18.1 6.00001 18.1H17C19.2644 18.1 21.1 16.2643 21.1 14C21.1 11.7356 19.2643 9.89998 17 9.89998H16C15.49 9.89998 15.0357 9.5713 14.8781 9.08376C14.2807 7.23517 12.5451 5.89998 10.5 5.89998Z"
          fill="#626D82"
        />
      </svg>
    </div>
  )
})

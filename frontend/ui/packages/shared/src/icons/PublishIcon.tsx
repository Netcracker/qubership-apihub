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

type SVGProps = {
  color?: string
}

export const PublishIcon: FC<SVGProps> = memo<SVGProps>(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2.75 11.251C3.16421 11.251 3.5 11.5868 3.5 12.001V12.4531C3.5 13.3056 3.50058 13.8998 3.53838 14.3624C3.57547 14.8163 3.6446 15.0771 3.74524 15.2746C3.96095 15.698 4.30516 16.0422 4.72852 16.2579C4.92604 16.3585 5.1868 16.4276 5.64068 16.4647C6.10331 16.5025 6.69755 16.5031 7.55 16.5031H12.45C13.3025 16.5031 13.8967 16.5025 14.3593 16.4647C14.8132 16.4276 15.074 16.3585 15.2715 16.2579C15.6949 16.0422 16.0391 15.6979 16.2548 15.2746C16.3554 15.0771 16.4246 14.8163 16.4616 14.3624C16.4994 13.8998 16.5 13.3055 16.5 12.4531L16.5 12.001C16.5 11.5868 16.8358 11.251 17.25 11.251C17.6642 11.251 18 11.5868 18 12.001L18 12.4852C18 13.298 18 13.9537 17.9567 14.4846C17.912 15.0312 17.8176 15.5113 17.5913 15.9556C17.2318 16.6612 16.6581 17.2349 15.9525 17.5944C15.5083 17.8207 15.0281 17.9151 14.4815 17.9597C13.9506 18.0031 13.295 18.0031 12.4821 18.0031H7.51791C6.70506 18.0031 6.04945 18.0031 5.51853 17.9597C4.9719 17.9151 4.49175 17.8207 4.04754 17.5944C3.34193 17.2349 2.76825 16.6612 2.40873 15.9556C2.18239 15.5114 2.08803 15.0312 2.04336 14.4846C1.99999 13.9537 1.99999 13.2981 2 12.4852L2 12.001C2 11.5868 2.33579 11.251 2.75 11.251Z"
          fill={color ?? '#626D82'}
        />
        <path
          d="M9.47034 2.22497C9.76324 1.93215 10.2381 1.93217 10.5309 2.22503L14.7771 6.47105C15.07 6.76394 15.07 7.23881 14.7771 7.53171C14.4842 7.82461 14.0093 7.82462 13.7164 7.53173L10.7506 4.56599L10.7506 13.251C10.7506 13.6653 10.4148 14.001 10.0006 14.001C9.58639 14.001 9.2506 13.6653 9.2506 13.251L9.2506 4.56571L6.2841 7.53146C5.99117 7.82431 5.5163 7.82425 5.22344 7.53132C4.93059 7.23839 4.93065 6.76352 5.22358 6.47066L9.47034 2.22497Z"
          fill={color ?? '#626D82'}
        />
      </svg>
    </div>
  )
})

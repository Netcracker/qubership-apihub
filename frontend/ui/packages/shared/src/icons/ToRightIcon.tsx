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

export const ToRightIcon: FC<SVGProps> = memo<SVGProps>(({ color }) => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="17" height="17" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0.499023 8.00237C0.499023 7.58816 0.83481 7.25237 1.24902 7.25237L13.9445 7.25237L8.71898 2.03244C8.42593 1.73971 8.42567 1.26483 8.71841 0.971782C9.01114 0.678731 9.48602 0.678475 9.77907 0.97121L16.2807 7.46581C16.4214 7.60641 16.5006 7.79717 16.5006 7.99611C16.5007 8.19506 16.4218 8.38589 16.2811 8.5266L16.2773 8.53039C16.2759 8.53183 16.2745 8.53327 16.273 8.53469L9.7795 15.0319C9.4867 15.3249 9.01182 15.325 8.71884 15.0322C8.42587 14.7394 8.42573 14.2645 8.71854 13.9716L13.9348 8.75237L1.24902 8.75237C0.83481 8.75237 0.499023 8.41658 0.499023 8.00237Z"
            fill={color ?? '#353C4E'}/>
        </svg>
      </div>
    )
  },
)

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

export const ToLeftIcon: FC<SVGProps> = memo<SVGProps>(({ color }) => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="17" height="17" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16.501 8.0012C16.501 8.41541 16.1652 8.7512 15.751 8.7512L3.05546 8.7512L8.28102 13.9711C8.57407 14.2639 8.57433 14.7387 8.28159 15.0318C7.98886 15.3248 7.51398 15.3251 7.22093 15.0324L0.719322 8.53776C0.57857 8.39716 0.499448 8.2064 0.499366 8.00746C0.499284 7.80851 0.578249 7.61768 0.718884 7.47697L0.72267 7.47318C0.724098 7.47174 0.725532 7.4703 0.726972 7.46887L7.2205 0.971652C7.5133 0.678675 7.98818 0.67854 8.28116 0.97135C8.57413 1.26416 8.57427 1.73903 8.28146 2.03201L3.06524 7.2512L15.751 7.2512C16.1652 7.2512 16.501 7.58699 16.501 8.0012Z"
            fill={color ?? '#353C4E'}/>
        </svg>
      </div>
    )
  },
)

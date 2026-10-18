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

export const FolderIcon: FC<{ color?: string }> = memo<{ color?: string }>(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4.58367 4.06266C3.72073 4.06266 3.02117 4.76222 3.02117 5.62516V8.03908C3.34486 7.89389 3.70482 7.81266 4.08615 7.81266H16.0624C16.3869 7.81266 16.6955 7.87136 16.9795 7.97807V7.7085C16.9795 6.84555 16.28 6.146 15.417 6.146H11.3617C10.8987 6.146 10.4503 5.98367 10.0946 5.68727L8.40586 4.27996C8.23737 4.13955 8.025 4.06266 7.80568 4.06266H4.58367ZM18.0212 8.70072C18.5184 9.2685 18.7704 10.0495 18.6276 10.8657L17.8984 15.0324C17.6804 16.2785 16.5983 17.1877 15.3333 17.1877H4.71115C3.42209 17.1877 2.32701 16.2446 2.13579 14.9698L1.51079 10.8031C1.40433 10.0934 1.59363 9.4159 1.97951 8.88576V5.62516C1.97951 4.18692 3.14543 3.021 4.58367 3.021H7.80568C8.26868 3.021 8.71703 3.18332 9.07271 3.47972L10.7615 4.88704C10.93 5.02744 11.1423 5.10433 11.3617 5.10433H15.417C16.8552 5.10433 18.0212 6.27025 18.0212 7.7085V8.70072ZM4.08615 8.85433C3.13088 8.85433 2.39923 9.70392 2.54093 10.6486L3.16593 14.8153C3.28066 15.5802 3.93771 16.146 4.71115 16.146H15.3333C16.0923 16.146 16.7415 15.6005 16.8724 14.8528L17.6015 10.6862C17.7689 9.73005 17.0331 8.85433 16.0624 8.85433H4.08615Z"
          fill={color ?? '#8F9EB4'}
        />
      </svg>
    </div>
  )
})

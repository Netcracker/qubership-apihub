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

export const GroupIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="white"/>
        <circle cx="10" cy="10" r="10" fill="#EDF1F5"/>
        <path
          d="M13.4529 9.02693C13.7781 9.05512 14.0872 9.11638 14.3703 9.27903C14.7967 9.52409 15.1235 9.91104 15.2939 10.3724C15.4069 10.6786 15.4157 10.9936 15.3891 11.319C15.3635 11.6328 15.2468 12.1169 15.2468 12.1169L15.1843 12.4021C15.1843 12.4021 15.0707 12.9949 15.0129 13.2279C14.952 13.4732 14.8712 13.7026 14.7286 13.9161C14.5091 14.2449 14.2011 14.505 13.8402 14.6666C13.6059 14.7714 13.3662 14.8127 13.1142 14.8317C12.8748 14.8498 12.5854 14.8498 12.2437 14.8498L7.73541 14.8498C7.39677 14.8498 7.10993 14.8498 6.87245 14.832C6.62242 14.8132 6.38459 14.7725 6.15173 14.669C5.79289 14.5097 5.48591 14.2529 5.26565 13.9278C5.12272 13.7169 5.04061 13.49 4.97795 13.2472C4.91844 13.0166 4.77026 12.4021 4.77026 12.4021L4.70362 12.122C4.62964 11.8708 4.60965 11.6667 4.57982 11.3394C4.54999 11.012 4.55589 10.6947 4.66759 10.3857C4.83576 9.9206 5.1627 9.52976 5.59081 9.28206C5.87516 9.11754 6.18645 9.05568 6.51393 9.02722C6.83006 8.99974 7.22159 8.99975 7.6919 8.99975H12.2848C12.7509 8.99975 13.1392 8.99974 13.4529 9.02693Z"
          fill="#626D82"
        />
        <path
          d="M7.24928 5.14941C6.08948 5.14941 5.14928 6.08962 5.14928 7.24941V7.78763C5.21926 7.75231 5.29075 7.71935 5.36365 7.68887C5.70153 7.54761 6.06682 7.48894 6.4879 7.46094C6.90056 7.43349 7.41245 7.43349 8.05473 7.4335L11.8836 7.4335C12.5213 7.43349 13.0297 7.43349 13.4398 7.4607C13.8584 7.48847 14.2216 7.54664 14.558 7.68659C14.6409 7.72105 14.7219 7.7587 14.801 7.79939C14.5949 6.85585 13.7546 6.14941 12.7493 6.14941L11.2347 6.14941C11.0676 6.14941 10.9038 6.10292 10.7617 6.01513L9.86741 5.46275C9.53577 5.25791 9.15366 5.14941 8.76385 5.14941H7.24928Z"
          fill="#626D82"
        />
      </svg>
    </div>
  )
})

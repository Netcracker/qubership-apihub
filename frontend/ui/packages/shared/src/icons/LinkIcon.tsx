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

export const LinkIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M11.0599 3.28315C12.622 1.72105 15.1547 1.72105 16.7168 3.28314C18.2789 4.84524 18.2789 7.3779 16.7168 8.94L16.0104 9.64642C15.7175 9.93931 15.2426 9.93931 14.9497 9.64642C14.6568 9.35352 14.6568 8.87865 14.9497 8.58576L15.6561 7.87934C16.6324 6.90303 16.6324 5.32011 15.6561 4.3438C14.6798 3.36749 13.0969 3.3675 12.1206 4.34381L9.29355 7.17086C8.31724 8.14717 8.31724 9.73008 9.29355 10.7064L9.69028 11.1031C9.98317 11.396 9.98317 11.8709 9.69028 12.1638C9.39739 12.4567 8.92251 12.4567 8.62962 12.1638L8.23289 11.767C6.67079 10.205 6.67079 7.67229 8.23289 6.1102L11.0599 3.28315ZM10.502 8.02852C10.7949 7.73562 11.2698 7.73562 11.5627 8.02852L11.7671 8.23289C13.3291 9.79499 13.3291 12.3276 11.767 13.8897L8.94 16.7168C7.3779 18.2789 4.84524 18.2789 3.28314 16.7168C1.72105 15.1547 1.72105 12.622 3.28315 11.0599L3.98956 10.3535C4.28246 10.0606 4.75733 10.0606 5.05022 10.3535C5.34312 10.6464 5.34312 11.1213 5.05022 11.4142L4.34381 12.1206C3.36749 13.0969 3.36749 14.6798 4.34381 15.6561C5.32012 16.6324 6.90303 16.6324 7.87934 15.6561L10.7064 12.8291C11.6827 11.8528 11.6827 10.2699 10.7064 9.29355L10.502 9.08918C10.2091 8.79628 10.2091 8.32141 10.502 8.02852Z"
          fill="#8F9EB4"
        />
      </svg>
    </div>
  )
})

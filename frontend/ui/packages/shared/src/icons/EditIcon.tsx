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

export type EditIconProps = {
  color?: string
}

export const EditIcon: FC<EditIconProps> = memo<EditIconProps>(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="EditIcon">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.0764 2.64904C13.5094 2.21662 14.0783 2.00018 14.6448 2.00018C15.2113 2.00018 15.7802 2.21662 16.2132 2.64904L17.3504 3.78485C17.7833 4.21728 18 4.78554 18 5.35134C18 5.91713 17.7833 6.4854 17.3504 6.91782L16.4086 7.85842L7.23857 17.0367C6.6209 17.6536 5.78317 18.0002 4.90967 18.0002H3.00004C2.44775 18.0002 2.00003 17.5525 2.00004 17.0002L2.00003 15.1075C1.99645 14.2302 2.34387 13.388 2.96477 12.7678L11.0882 4.63533L13.0764 2.64904ZM15.3619 6.78382L16.2891 5.8578C16.4292 5.71779 16.4991 5.5358 16.4991 5.35134C16.4991 5.16687 16.4292 4.98488 16.2891 4.84488L15.1519 3.70907C15.0117 3.56907 14.8295 3.49929 14.6448 3.49929C14.4601 3.49929 14.2779 3.56907 14.1377 3.70907L13.2106 4.6351L15.3619 6.78382ZM12.135 5.70993L4.02604 13.8279C3.68981 14.1637 3.50091 14.6192 3.50091 15.0941L3.50019 16.2009C3.50009 16.3667 3.63443 16.5011 3.80019 16.5011H4.90967C5.38512 16.5011 5.8411 16.3125 6.1773 15.9767L14.2863 7.85865L12.135 5.70993Z"
          fill={color ?? '#353C4E'}
        />
      </svg>
    </div>
  )
})

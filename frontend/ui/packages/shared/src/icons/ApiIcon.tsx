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

export const ApiIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2.13192 14H0.444425L3.51687 5.27273H5.46857L8.54528 14H6.85778L4.52681 7.0625H4.45863L2.13192 14ZM2.18732 10.5781H6.7896V11.848H2.18732V10.5781ZM9.69478 14V5.27273H12.9675C13.638 5.27273 14.2005 5.39773 14.655 5.64773C15.1124 5.89773 15.4576 6.24148 15.6905 6.67898C15.9263 7.11364 16.0442 7.60795 16.0442 8.16193C16.0442 8.72159 15.9263 9.21875 15.6905 9.65341C15.4547 10.0881 15.1067 10.4304 14.6465 10.6804C14.1863 10.9276 13.6195 11.0511 12.9462 11.0511H10.7772V9.75142H12.7331C13.1252 9.75142 13.4462 9.68324 13.6962 9.54688C13.9462 9.41051 14.1309 9.22301 14.2502 8.98438C14.3723 8.74574 14.4334 8.47159 14.4334 8.16193C14.4334 7.85227 14.3723 7.57955 14.2502 7.34375C14.1309 7.10795 13.9448 6.92472 13.6919 6.79403C13.4419 6.66051 13.1195 6.59375 12.7246 6.59375H11.2757V14H9.69478ZM18.9984 5.27273V14H17.4174V5.27273H18.9984Z"
          fill="#626D82"
        />
      </svg>
    </div>
  )
})

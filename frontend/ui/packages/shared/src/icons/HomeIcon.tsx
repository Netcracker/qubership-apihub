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
import * as React from 'react'
import { memo } from 'react'

export const HomeIcon: FC = memo(() => {
  return (
    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.22202 2.51737C9.91363 1.77806 11.0864 1.77807 11.778 2.51737L17.8931 9.05423C18.2831 9.47107 18.5 10.0205 18.5 10.5913V15.7491C18.5 16.9917 17.4926 17.9991 16.25 17.9991H12.75C12.0596 17.9991 11.5 17.4395 11.5 16.7491V13.9991C11.5 13.4468 11.0523 12.9991 10.5 12.9991C9.94772 12.9991 9.5 13.4468 9.5 13.9991V16.7491C9.5 17.4395 8.94036 17.9991 8.25 17.9991H4.75C3.50736 17.9991 2.5 16.9917 2.5 15.7491V10.5913C2.5 10.0205 2.71694 9.47107 3.10689 9.05423L9.22202 2.51737ZM10.6826 3.5421C10.5838 3.43649 10.4162 3.43649 10.3174 3.5421L4.2023 10.079C4.07231 10.2179 4 10.4011 4 10.5913V15.7491C4 16.1633 4.33579 16.4991 4.75 16.4991H8V13.9991C8 12.6184 9.11929 11.4991 10.5 11.4991C11.8807 11.4991 13 12.6184 13 13.9991V16.4991H16.25C16.6642 16.4991 17 16.1633 17 15.7491V10.5913C17 10.4011 16.9277 10.2179 16.7977 10.079L10.6826 3.5421Z"
        fill="currentColor"
      />
    </svg>
  )
})

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

export type WarningIconProps = {
  color?: string
  fill: boolean
}

const WarningIcon: FC<WarningIconProps> = memo(({ color = '#626D82', fill = false }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 8.4647 3.2441 C 9.1285 2.0305 10.8716 2.0305 11.5354 3.2441 L 17.6429 14.4102 C 18.2807 15.5764 17.4368 17 16.1075 17 H 3.8926 C 2.5634 17 1.7194 15.5764 2.3573 14.4102 L 8.4647 3.2441 Z Z"
          fill={`${fill ? color : 'none'}`}
        />
        <path
          d="M8.46473 3.24412C9.12854 2.03049 10.8716 2.03048 11.5354 3.24412L17.6429 14.4102C18.2807 15.5764 17.4368 17 16.1075 17H3.89261C2.56336 17 1.7194 15.5764 2.35727 14.4102L8.46473 3.24412ZM10.2194 3.96392C10.1246 3.79055 9.87557 3.79055 9.78074 3.96392L3.67328 15.13C3.58216 15.2966 3.70272 15.5 3.89261 15.5H16.1075C16.2974 15.5 16.418 15.2966 16.3269 15.13L10.2194 3.96392Z"
          fill={`${!fill ? color : 'none'}`}
        />
        <path
          d="M10.004 6.74966C10.4182 6.74966 10.754 7.08545 10.754 7.49966V11.2551C10.754 11.6693 10.4182 12.0051 10.004 12.0051C9.58976 12.0051 9.25398 11.6693 9.25398 11.2551V7.49966C9.25398 7.08545 9.58976 6.74966 10.004 6.74966Z"
          fill={`${!fill ? color : 'white'}`}
        />
        <path
          d="M10.8997 13.4C10.8997 13.8971 10.4967 14.3 9.99968 14.3C9.50262 14.3 9.09968 13.8971 9.09968 13.4C9.09968 12.9029 9.50262 12.5 9.99968 12.5C10.4967 12.5 10.8997 12.9029 10.8997 13.4Z"
          fill={`${!fill ? color : 'white'}`}
        />
      </svg>
    </div>
  )
})

export const DefaultWarningIcon: FC = memo(() => {
  return (
    <WarningIcon fill={false}/>
  )
})

export const YellowWarningIcon: FC = memo(() => {
  return (
    <WarningIcon color="#FFB02E" fill={true}/>
  )
})

export const RedWarningIcon: FC = memo(() => {
  return (
    <WarningIcon color="#FF5260" fill={true}/>
  )
})

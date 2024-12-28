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

import { FC, PropsWithChildren } from 'react'

type NestingIndicatorProps = {
  level?: number
  lastInvisible?: boolean
}

export const NestingIndicator: FC<NestingIndicatorProps> = (props) => {
  const { level = 0, lastInvisible = false } = props

  return (
    <>
      {level > 0 && (
        <div data-name="NestingIndicator" className="flex">
          {Array(level).fill(0).map((value, index, array) => {
            const key = `NestingIndicator-${index}`
            if (lastInvisible && index === array.length - 1) {
              return <div key={key} className="w-5"/>
            }
            return <NestingVerticalIndicator key={key}/>
          })}
        </div>
      )}
    </>
  )
}

const NestingVerticalIndicator: FC = () => {
  return (
    <div className="w-5 h-full border-r border-slate-400">
      &nbsp;
    </div>
  )
}

export const NestingHorizontalIndicator: FC<{ short?: boolean }> = (props) => {
  const { short = false } = props
  return (
    <div className="bg-slate-400 h-px" style={{ width: short ? '4px' : '16px' }}>
    </div>
  )
}

export const NestingIndicatorTitle: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="text-xs text-slate-400 border-b border-slate-400 w-max pt-1"
         style={{ marginLeft: '-1px' }}
    >
      {children}
    </div>
  )
}
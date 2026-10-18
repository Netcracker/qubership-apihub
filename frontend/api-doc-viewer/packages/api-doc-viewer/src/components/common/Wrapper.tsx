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

import React from "react";
import { FC, PropsWithChildren, ReactNode } from "react";

type WrapperProps = {
  wrapper?: FC<PropsWithChildren>
  children?: ReactNode[]
}

const DEFAULT_WRAPPER: FC<PropsWithChildren> = ({ children }) => <>{children}</>

export const Wrapper: FC<WrapperProps> = (props) => {
  const {
    wrapper: WrapperInternal = DEFAULT_WRAPPER,
    children = []
  } = props

  if (children.length < 2) {
    return <>{children[0]}</>
  }
  return (
    <WrapperInternal>
      {children.map((child, i) => (
        <React.Fragment key={i}>
          {child}
        </React.Fragment>
      ))}
    </WrapperInternal>
  )
}

export class DefaultWrappers {
  public static readonly DivGap2: FC<PropsWithChildren> = ({ children }) => (
    <div className="flex flex-row items-start gap-2">
      {children}
    </div>
  )
}

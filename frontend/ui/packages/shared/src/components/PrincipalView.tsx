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
import React, { memo } from 'react'
import { Box } from '@mui/material'
import { KeyIcon } from '../icons/KeyIcon'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'
import type { Principal } from '../entities/principals'
import { API_KEY } from '../entities/principals'
import { UserView } from './Users/UserView'

export type PrincipalViewProps = {
  value: Principal | undefined
}

export const PrincipalView: FC<PrincipalViewProps> = memo<PrincipalViewProps>(({ value }) => {

  if (!value) {
    return null
  }

  if (value.type === API_KEY) {
    return (<TokenView name={value.name}/>)
  }

  return (
    <UserView
      name={value.name || value.id}
      avatarUrl={value.avatarUrl}
    />
  )
})

type TokenViewProps = {
  name?: string
}

const TokenView: FC<TokenViewProps> = memo<TokenViewProps>(({ name }) => {
  const tokenName = `API key: ${name}`
  return (
    <Box display="flex" alignItems="center" gap="4px" overflow="hidden" data-testid="TokenView">
      <KeyIcon/>
      <TextWithOverflowTooltip tooltipText={tokenName}>
        {tokenName}
      </TextWithOverflowTooltip>
    </Box>
  )
})

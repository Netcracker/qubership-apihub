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
import { API_KEY, JOB } from '../entities/principals'
import { UserView } from './Users/UserView'
import { RobotIcon } from '../icons/RobotIcon'

export type PrincipalViewProps = {
  value: Principal | undefined
}

export const PrincipalView: FC<PrincipalViewProps> = memo<PrincipalViewProps>(({ value }) => {

  if (!value) {
    return null
  }

  if (value.type === API_KEY || value.type === JOB) {
    return <TokenAndJobView type={value.type} name={value.name}/>
  }

  return (
    <UserView
      name={value.name || value.id}
      avatarUrl={value.avatarUrl}
    />
  )
})

type TokenAndJobViewProps = {
  name?: string
  type: string
}

const TokenAndJobView: FC<TokenAndJobViewProps> = memo<TokenAndJobViewProps>(({ name, type }) => {
  let viewName: string | undefined
  let viewIcon: JSX.Element = <></>
  switch (type) {
    case API_KEY:
      viewName = `API key: ${name}`
      viewIcon = <KeyIcon/>
      break
    case JOB:
      viewName = `Job: ${name}`
      viewIcon = <RobotIcon color="muted" fontSize="small"/>
      break
  }

  return (
    <Box display="flex" alignItems="center" gap="4px" overflow="hidden" data-testid="TokenView">
      {viewIcon}
      <TextWithOverflowTooltip tooltipText={viewName}>
        {viewName}
      </TextWithOverflowTooltip>
    </Box>
  )
})


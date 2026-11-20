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


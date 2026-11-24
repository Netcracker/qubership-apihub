import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'
import { Subtitle } from './Subtitle'

type HeaderProps = Partial<{
  agentId: string
  namespaceKey: string
  specKey?: string
}>

export const Header: FC<PropsWithChildren<HeaderProps>> = memo<PropsWithChildren<HeaderProps>>((props) => {
  const { agentId, namespaceKey, specKey, children } = props

  return (
    <Box display="inline-flex" gap="16px" alignItems="center" justifyContent="center">
      <Subtitle label="Cloud" value={agentId}/>
      <Subtitle label="Namespace" value={namespaceKey}/>
      <Subtitle label="Service" value={specKey}/>
      {children}
    </Box>
  )
})

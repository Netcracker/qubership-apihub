import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { isPlainObject } from 'lodash-es'
import { type FC, memo, useMemo } from 'react'

import {
  MCP_COLLECTION_LABELS,
  MCP_COLLECTION_PROMPTS,
  MCP_COLLECTION_RESOURCES,
  MCP_COLLECTION_TOOLS,
} from '../../entities/contracts-mcp'
import { toOptionalTrimmedString } from '../../utils/strings'
import type { TestableProps } from '../Testable'

export type McpOverviewDetailsProps =
  & Readonly<{
    data?: Record<string, unknown>
  }>
  & TestableProps

export const McpOverviewDetails: FC<McpOverviewDetailsProps> = memo<McpOverviewDetailsProps>(({
  data,
  'data-testid': dataTestId,
}) => {
  const capabilities = useMemo(
    () => extractMcpCapabilities(data),
    [data],
  )

  const instructions = useMemo(
    () => extractMcpInstructions(data),
    [data],
  )

  return (
    <ContentRoot data-testid={dataTestId}>
      {capabilities.length > 0 && (
        <Section>
          <SectionTitle variant="subtitle1">Capabilities:</SectionTitle>
          <BulletList>
            {capabilities.map(label => (
              <Typography key={label} component="li" variant="body2">
                {label}
              </Typography>
            ))}
          </BulletList>
        </Section>
      )}

      {instructions && (
        <Section>
          <SectionTitle variant="subtitle1">Instructions:</SectionTitle>
          <InstructionsText variant="body2">
            {instructions}
          </InstructionsText>
        </Section>
      )}
    </ContentRoot>
  )
})

McpOverviewDetails.displayName = 'McpOverviewDetails'

const MCP_CAPABILITY_COLLECTIONS = [
  MCP_COLLECTION_TOOLS,
  MCP_COLLECTION_RESOURCES,
  MCP_COLLECTION_PROMPTS,
] as const

function extractMcpCapabilities(data: Record<string, unknown> | undefined): ReadonlyArray<string> {
  const capabilities = data?.capabilities
  if (!isPlainObject(capabilities)) {
    return []
  }
  const caps = capabilities as Record<string, unknown>
  return MCP_CAPABILITY_COLLECTIONS
    .filter(collection => collection in caps)
    .map(collection => MCP_COLLECTION_LABELS[collection])
}

function extractMcpInstructions(data: Record<string, unknown> | undefined): string | undefined {
  return toOptionalTrimmedString(data?.instructions)
}

const ContentRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))

const Section = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}))

const SectionTitle = styled(Typography)({
  fontWeight: 600,
})

const BulletList = styled('ul')(({ theme }) => ({
  margin: 0,
  paddingLeft: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}))

const InstructionsText = styled(Typography)({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
})

import { styled, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'

import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

type FrontTruncatedTextProps = TestableProps & {
  text: string
  children?: ReactNode
}

export const FrontTruncatedText: FC<FrontTruncatedTextProps> = (
  { text, children = text, 'data-testid': dataTestId },
) => (
  <OverflowTooltip title={text}>
    <FrontTruncatedValue variant="body2" data-testid={dataTestId}>
      <bdi dir="ltr">{children}</bdi>
    </FrontTruncatedValue>
  </OverflowTooltip>
)
FrontTruncatedText.displayName = 'FrontTruncatedText'

const FrontTruncatedValue = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  direction: 'rtl',
  textAlign: 'left',
})

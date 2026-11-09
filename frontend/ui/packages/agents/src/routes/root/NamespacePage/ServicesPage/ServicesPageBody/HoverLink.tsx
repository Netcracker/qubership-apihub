import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import { Button, styled } from '@mui/material'
import type { FC } from 'react'

import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

type HoverLinkProps = TestableProps & {
  url: string | undefined
  label: string
}

// A link at the right end of a table row; the theme shows it while the pointer is over the row
export const HoverLink: FC<HoverLinkProps> = ({ url, label, 'data-testid': dataTestId }) => {
  if (!url) {
    return null
  }

  return (
    <HoverLinkButton
      data-testid={dataTestId}
      className="hoverable"
      component="a"
      variant="text"
      href={url}
      target="_blank"
      startIcon={<ArrowOutwardRoundedIcon />}
    >
      {label}
    </HoverLinkButton>
  )
}

HoverLink.displayName = 'HoverLink'

const HoverLinkButton = styled(Button)({
  visibility: 'hidden',
  padding: 0,
  height: 10,
  whiteSpace: 'nowrap',
}) as typeof Button

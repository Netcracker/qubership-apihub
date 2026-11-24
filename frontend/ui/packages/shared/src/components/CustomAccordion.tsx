import type { FC, ReactNode } from 'react'
import React, { memo } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export type CustomAccordionProps = {
  expanded: boolean
  title: string
  accordionDetails: ReactNode
  setExpanded: () => void
}
export const CustomAccordion: FC<CustomAccordionProps> = memo<CustomAccordionProps>((props) => {
  const { expanded, accordionDetails, title, setExpanded } = props

  return (
    <Accordion expanded={expanded} onChange={setExpanded} elevation={0} sx={{ display: 'contents' }}>
      <AccordionSummary
        sx={ACCORDION_SUMMARY_STYLE}
        expandIcon={<ExpandMoreIcon/>}
      >
        <Typography width="100%" noWrap variant="button">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ width: '100%' }}>
        {accordionDetails}
      </AccordionDetails>
    </Accordion>
  )
})

const ACCORDION_SUMMARY_STYLE = {
  '&.MuiButtonBase-root': {
    p: 0,
    '&.MuiAccordionSummary-root': {
      flexDirection: 'row-reverse',
      '.MuiAccordionSummary-content': {
        width: '100%',
        display: 'contents',
      },
    },
  },
}

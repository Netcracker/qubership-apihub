import type { FC } from 'react'
import React, { useCallback, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { OperationsFilterByDocument } from './OperationsFilterByDocument'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Document } from '@portal/entities/documents'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export type OperationsFilterPanelProps = {
  packageKey: Key
  versionKey: Key
  apiType?: ApiType | ContractType
  comparisonPage?: boolean
}

const ACCORDION_SUMMARY_STYLE = {
  flexDirection: 'row-reverse',
  p: 0,
}

export const OperationsFilterPanel: FC<OperationsFilterPanelProps> = (props) => {
  const { packageKey, versionKey, apiType } = props

  const [refKey] = useRefSearchParam()
  const [documentSlug, setDocument] = useDocumentSearchParam()

  const [expanded, setExpanded] = useState<boolean>(!!documentSlug || !!refKey)

  const onDocumentSelect = useCallback((newDocument: Document | null) => {
    setDocument(newDocument?.slug)
  }, [setDocument])

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
      <AccordionSummary
        sx={ACCORDION_SUMMARY_STYLE}
        expandIcon={<ExpandMoreIcon/>}
        data-testid="FiltersAccordionButton"
      >
        <Typography width="100%" noWrap variant="button">
          Filters
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <OperationsFilterByDocument
          packageKey={packageKey}
          versionKey={versionKey}
          apiType={apiType}
          defaultDocumentSlug={documentSlug}
          onDocumentSelect={onDocumentSelect}
        />
      </AccordionDetails>
    </Accordion>
  )
}

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
import React, { useCallback, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { OperationsFilterByDocument } from './OperationsFilterByDocument'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Document } from '@apihub/entities/documents'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationsFilterPanelProps = {
  packageKey: Key
  versionKey: Key
  apiTypeFilter: ApiType
  comparisonPage?: boolean
}

const ACCORDION_SUMMARY_STYLE = {
  flexDirection: 'row-reverse',
  p: 0,
}

export const OperationsFilterPanel: FC<OperationsFilterPanelProps> = (props) => {
  const { packageKey, versionKey, apiTypeFilter } = props

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
          apiTypeFilter={apiTypeFilter}
          defaultDocumentSlug={documentSlug}
          onDocumentSelect={onDocumentSelect}
        />
      </AccordionDetails>
    </Accordion>
  )
}

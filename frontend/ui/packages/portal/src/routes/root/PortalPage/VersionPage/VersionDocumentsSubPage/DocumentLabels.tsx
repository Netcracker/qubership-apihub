import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'

import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'

import type { Labels } from '@apihub/entities/documents'

export type DocumentLabelsProps = Readonly<{
  labels?: Labels
}>

export const DocumentLabels: FC<DocumentLabelsProps> = memo<DocumentLabelsProps>(({ labels }) => {
  if (!labels?.length) {
    return null
  }

  return (
    <LabelsContainer data-testid="DocumentLabels">
      {labels.map(label => (
        <LabelChip
          key={label}
          value={label}
        />
      ))}
    </LabelsContainer>
  )
})

DocumentLabels.displayName = 'DocumentLabels'

const LabelsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}))

const LabelChip = styled(CustomChip)(({ theme }) => ({
  marginRight: theme.spacing(1),
}))

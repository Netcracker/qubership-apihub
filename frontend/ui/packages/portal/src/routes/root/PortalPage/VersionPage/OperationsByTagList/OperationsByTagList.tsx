import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Skeleton, Typography } from '@mui/material'
import type { OperationPairsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { GROUP_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Dispatch, FC, SetStateAction } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { OperationsListOnComparison } from './OperationsListOnComparison'

export type OperationsByTagListProps = {
  tag: string
  operationsGroupedByTag: OperationPairsGroupedByTag
  isLoading: boolean
  expanded: readonly string[]
  setExpanded: Dispatch<SetStateAction<readonly string[]>>
}

export const OperationsByTagList: FC<OperationsByTagListProps> = memo<OperationsByTagListProps>(props => {
  const {
    tag,
    operationsGroupedByTag,
    isLoading = true,
    expanded,
    setExpanded,
  } = props
  const operationsList = operationsGroupedByTag[tag]

  const group = useSearchParam(GROUP_SEARCH_PARAM)

  const handleTagSelection = useCallback((tag: string) => {
    setExpanded(prevState => (
      !prevState.includes(tag)
        ? [...prevState, tag]
        : prevState.filter(key => key !== tag)
    ))
  }, [setExpanded])

  const isTagExpanded = useMemo(() => expanded.includes(tag), [expanded, tag])
  const onChange = useCallback(() => handleTagSelection(tag), [handleTagSelection, tag])

  return (
    <Accordion expanded={isTagExpanded} onChange={onChange}>
      <AccordionSummary
        sx={ACCORDION_SUMMARY_STYLE}
        expandIcon={<ExpandMoreIcon />}
        data-testid="TagAccordionButton"
      >
        <Typography width="100%" noWrap variant="button">{tag}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {isTagExpanded && (
          group
            ? <OperationsListOnComparison changedOperationPairs={operationsList} />
            : <OperationsListOnComparison changedOperationPairs={operationsList} />
        )}
        {isLoading && <Skeleton sx={{ ml: 4, mr: 1 }} />}
      </AccordionDetails>
    </Accordion>
  )
})

const ACCORDION_SUMMARY_STYLE = {
  '&.MuiButtonBase-root': {
    '&.MuiAccordionSummary-root': {
      '.MuiAccordionSummary-content': {
        width: '100%',
        display: 'contents',
      },
    },
  },
}

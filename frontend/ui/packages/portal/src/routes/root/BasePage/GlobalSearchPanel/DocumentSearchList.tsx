import { type FC, memo, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { Marker } from 'react-mark.js'

import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import {
  isDdlDocumentSpecType,
  isMcpDocumentSpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import type { DocumentSearchResult } from '@portal/entities/global-search'
import { getDocumentPath } from '../../../NavigationProvider'
import type { FetchNextSearchResultList } from './global-search'
import { RateResults } from './RateResults'
import { ResultCommonHeader } from './ResultCommonHeader'
import {
  SearchResultListRoot,
  SearchResultListSentinel,
  SearchResultRowRoot,
} from './SearchResultRowLayout'

type DocumentSearchListProps = {
  value: DocumentSearchResult[]
  searchText: string
  fetchNextPage?: FetchNextSearchResultList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
}

export const DocumentSearchList: FC<DocumentSearchListProps> = memo<DocumentSearchListProps>((
  { value, searchText, isNextPageFetching, hasNextPage, fetchNextPage },
) => {
  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <SearchResultListRoot>
      {value.map(
        ({
          packageKey,
          name,
          parentPackages,
          labels,
          version,
          slug,
          type,
          title,
          status,
          content,
          createdAt,
        }) => {
          const { versionKey } = getSplittedVersionKey(version)
          return (
            <SearchResultRowRoot
              key={`document-search-${packageKey}-${slug}-${version}`}
              data-testid="SearchResultRow"
            >
              <ResultCommonHeader
                url={getDocumentPath({ packageKey: packageKey, versionKey: versionKey, documentKey: slug })}
                icon={type}
                breadCrumbsStatus={status}
                title={title}
                parents={[...parentPackages, name, versionKey]}
                searchText={searchText}
              />
              <Marker mark={searchText}>
                <Box display="flex" gap={1} alignItems="center">
                  <Typography variant="body2">Publication date</Typography>
                  <Typography variant="subtitle2" data-testid="PublicationDateValue">
                    <FormattedDate value={createdAt}/>
                  </Typography>
                </Box>

                <RateResults searchText={searchText} labels={labels}/>
                {!isMcpDocumentSpecType(type) && !isDdlDocumentSpecType(type) && (
                  <Typography noWrap variant="body2" data-testid="DocumentContent">
                    {content ?? 'No content'}
                  </Typography>
                )}
              </Marker>
            </SearchResultRowRoot>
          )
        })}

      {hasNextPage && (
        <SearchResultListSentinel ref={ref}>
          <LoadingIndicator/>
        </SearchResultListSentinel>
      )}
    </SearchResultListRoot>
  )
})

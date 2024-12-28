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

import type { Dispatch, FC, ReactNode, SetStateAction } from 'react'
import { memo, useCallback } from 'react'
import { Box, Grid, Skeleton, Typography } from '@mui/material'
import { useSelectedSubPage, useSetSelectedSubPage } from './SelectedSubPageProvider'
import type { ReactJSXElement } from '@emotion/react/types/jsx-namespace'
import { DocumentActionsButton } from './DocumentActionsButton'
import type { Key } from '@apihub/entities/keys'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { isGraphQlSpecType, isOpenApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import type { DocumentsTabSubPageKey } from '@apihub/routes/root/PortalPage/VersionPage/OpenApiViewer/OpenApiViewer'
import {
  OPERATIONS_SUB_PAGE,
  OVERVIEW_SUB_PAGE,
} from '@apihub/routes/root/PortalPage/VersionPage/OpenApiViewer/OpenApiViewer'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

export type DocumentsTabHeaderProps = {
  title: string
  version?: string
  slug: Key
  type: SpecType
  format: FileFormat
  searchValue: string
  setSearchValue: Dispatch<SetStateAction<string>>
  isLoading?: boolean
}

const DocumentsSubPageSelector = memo(() => {
  const selectedSubPage = useSelectedSubPage()
  const setSelectedSubPage = useSetSelectedSubPage()

  return (
    <Box
      sx={{
        backgroundColor: '#F2F3F5',
        borderRadius: 2,
        display: 'flex',
        flexWrap: 'wrap',
        width: 'max-content',
      }}
    >
      <Toggler
        mode={selectedSubPage as string}
        modes={[OVERVIEW_SUB_PAGE, OPERATIONS_SUB_PAGE]}
        onChange={(newSelectedSubPage) => {
          setSelectedSubPage(newSelectedSubPage as DocumentsTabSubPageKey)
        }}
      />
    </Box>
  )
})

export const DocumentsTabHeader: FC<DocumentsTabHeaderProps> = (props) => {
  const {
    title,
    version,
    slug,
    type,
    format,
    searchValue,
    setSearchValue,
    isLoading = true,
  } = props

  const selectedSubPage = useSelectedSubPage()

  const HeaderLayout = useCallback(({ left, right }: {
    left: ReactNode
    right: ReactNode
  }): ReactJSXElement => {
    return (
      <Grid container data-testid="DocumentToolbar">
        <Grid xs={4}>
          {left}
        </Grid>
        <Grid xs={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {right}
        </Grid>
      </Grid>
    )
  }, [])

  if (isLoading) {
    return (
      <HeaderLayout
        left={(
          <Box display="flex" flexDirection="column">
            <Skeleton sx={{ width: 200 }}/>
            <Skeleton sx={{ width: 100 }}/>
          </Box>
        )}
        right={<Skeleton sx={{ width: 170 }}/>}
      />
    )
  }

  return (
    <HeaderLayout
      left={(
        <TextWithOverflowTooltip tooltipText={title} variant="inherit">
          <Box display="flex" alignItems="center" gap={1} data-testid="DocumentToolbarTitle">
            {title}
            <Typography variant="body2" sx={{ color: DOC_VERSION_COLOR }}>
              {version}
            </Typography>
          </Box>
        </TextWithOverflowTooltip>
      )}
      right={(
        <Box display="flex" gap={1}>
          {(isOpenApiSpecType(type) || isGraphQlSpecType(type)) && (
            <>
              {selectedSubPage === OPERATIONS_SUB_PAGE && (
                <SearchBar
                  sx={{ width: '200px' }}
                  value={searchValue}
                  onValueChange={setSearchValue}
                  data-testid="SearchOperations"
                />
              )}
              <DocumentsSubPageSelector/>
            </>
          )}
          <DocumentActionsButton
            slug={slug}
            docType={type}
            format={format}
            customProps={{
              title: 'Download',
              variant: 'outlined',
            }}
          />
        </Box>
      )}
    />
  )
}

const DOC_VERSION_COLOR = 'rgba(0, 0, 0, 0.6)'

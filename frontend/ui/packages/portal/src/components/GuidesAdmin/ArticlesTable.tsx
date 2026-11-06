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

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { Box, Chip, Collapse, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { isEmpty } from 'lodash'
import type { FC } from 'react'
import { Fragment, memo, useState } from 'react'

import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { TableCellSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/TableCellSkeleton'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { createComponents } from '@netcracker/qubership-apihub-ui-shared/utils/components'
import { DEFAULT_NUMBER_SKELETON_ROWS } from '@netcracker/qubership-apihub-ui-shared/utils/constants'

import type { Article } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_SCOPE_PACKAGE } from '@portal/api-hooks/docs-backend/types'
import { ArticleActions } from './ArticleActions'
import { ArticleFilesPanel } from './ArticleFilesPanel'

export type ArticlesTableProps = Readonly<{
  articles: ReadonlyArray<Article>
  isLoading: boolean
  onEdit: (article: Article) => void
}>

const COLUMNS_COUNT = 8

export const ArticlesTable: FC<ArticlesTableProps> = memo<ArticlesTableProps>(({ articles, isLoading, onEdit }) => {
  if (isEmpty(articles) && !isLoading) {
    return (
      <Placeholder
        sx={{ width: 'inherit' }}
        invisible={isLoading}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No Articles"
      />
    )
  }

  return (
    <TableContainer sx={{ mt: 1, maxHeight: 'calc(100vh - 260px)' }}>
      <Table stickyHeader data-testid="ArticlesTable">
        <TableHead>
          <TableRow>
            <TableCell width={48}/>
            <TableCell><CustomTableHeadCell title="Title"/></TableCell>
            <TableCell width={110}><CustomTableHeadCell title="Scope"/></TableCell>
            <TableCell width={260}><CustomTableHeadCell title="Audience / Package"/></TableCell>
            <TableCell width={120}><CustomTableHeadCell title="Status"/></TableCell>
            <TableCell width={80}><CustomTableHeadCell title="Order"/></TableCell>
            <TableCell width={140}><CustomTableHeadCell title="Updated At"/></TableCell>
            <TableCell width={150}/>
          </TableRow>
        </TableHead>
        <TableBody>
          {articles.map(article => (
            <ArticleRow key={article.slug} article={article} onEdit={onEdit}/>
          ))}
          {isLoading && <TableSkeleton/>}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const ArticleRow: FC<{ article: Article; onEdit: (article: Article) => void }> = memo(({ article, onEdit }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <Fragment>
            <TableRow hover sx={{ '&:hover .hoverable': { visibility: 'visible' }, '& > td': { borderBottom: expanded ? 'none' : undefined } }} data-testid="ArticleRow">
              <TableCell>
                <IconButton size="small" aria-label={expanded ? 'Hide files' : 'Show files'} onClick={() => setExpanded(value => !value)} data-testid="ToggleArticleFilesButton">
                  {expanded ? <KeyboardArrowDownIcon fontSize="small"/> : <KeyboardArrowRightIcon fontSize="small"/>}
                </IconButton>
              </TableCell>
              <TableCell>
                <TextWithOverflowTooltip tooltipText={article.title}>{article.title}</TextWithOverflowTooltip>
                <Typography variant="body2" color="text.secondary" noWrap>{article.slug}</Typography>
              </TableCell>
              <TableCell>
                <Chip size="small" label={article.scope} variant="outlined"/>
              </TableCell>
              <TableCell>
                {article.scope === ARTICLE_SCOPE_PACKAGE
                  ? (
                    <Box minWidth={0}>
                      <TextWithOverflowTooltip tooltipText={article.packageId ?? ''}>{article.packageId}</TextWithOverflowTooltip>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {article.version ?? 'all versions'} · {article.documentSlug}
                      </Typography>
                    </Box>
                  )
                  : <Chip size="small" label={article.visibility} color={article.visibility === 'public' ? 'success' : 'default'} variant="outlined"/>}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={article.published ? 'Published' : 'Draft'}
                  color={article.published ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell>{article.displayOrder}</TableCell>
              <TableCell><FormattedDate value={article.updatedAt}/></TableCell>
              <TableCell><ArticleActions article={article} onEdit={onEdit}/></TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={COLUMNS_COUNT} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                <Collapse in={expanded} unmountOnExit>
                  <Box sx={{ pl: 6, pr: 2, py: 2 }}>
                    <ArticleFilesPanel article={article}/>
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>
    </Fragment>
  )
})

const TableSkeleton: FC = memo(() => createComponents(<RowSkeleton/>, DEFAULT_NUMBER_SKELETON_ROWS))

const RowSkeleton: FC = memo(() => (
  <TableRow>
    {Array.from({ length: COLUMNS_COUNT }, (_, index) => <TableCellSkeleton key={index}/>)}
  </TableRow>
))

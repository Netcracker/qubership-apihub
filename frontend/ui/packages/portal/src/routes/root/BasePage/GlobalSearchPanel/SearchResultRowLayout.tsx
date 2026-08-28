import { Box, Link, styled, Typography, type TypographyProps } from '@mui/material'
import { type FC, memo } from 'react'
import { Marker } from 'react-mark.js'
import { NavLink, type To } from 'react-router-dom'

import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'

import { CONTENT_WIDTH, INFINITE_SCROLL_SENTINEL_HEIGHT } from './globalSearchConstants'

type SearchResultBreadcrumbsProps = Readonly<{
  breadcrumbs: string
}>

export const SearchResultBreadcrumbs: FC<SearchResultBreadcrumbsProps> = memo<SearchResultBreadcrumbsProps>(({
  breadcrumbs,
}) => (
  <OverflowTooltip title={breadcrumbs}>
    <SearchResultSecondaryText noWrap data-testid="PathToSearchResultItem">
      {breadcrumbs}
    </SearchResultSecondaryText>
  </OverflowTooltip>
))

SearchResultBreadcrumbs.displayName = 'SearchResultBreadcrumbs'

type SearchResultMetaLineProps =
  & TestableProps
  & Readonly<{
    label?: string
    value: string
    searchText: string
    valueTestId?: string
  }>

export const SearchResultMetaLine: FC<SearchResultMetaLineProps> = memo<SearchResultMetaLineProps>(({
  label,
  value,
  searchText,
  valueTestId,
  'data-testid': dataTestId,
}) => (
  <SearchResultRowSection data-testid={dataTestId}>
    {label && <SearchResultMetaLabel>{label}</SearchResultMetaLabel>}
    <Marker mark={searchText}>
      <TextWithOverflowTooltip variant="subtitle2" tooltipText={value} data-testid={valueTestId}>
        {value}
      </TextWithOverflowTooltip>
    </Marker>
  </SearchResultRowSection>
))

SearchResultMetaLine.displayName = 'SearchResultMetaLine'

type SearchResultPrimaryTitleProps = Readonly<{
  url: To
  title: string
  onLinkClick?: () => void
}>

export const SearchResultPrimaryTitle: FC<SearchResultPrimaryTitleProps> = memo<SearchResultPrimaryTitleProps>(({
  url,
  title,
  onLinkClick,
}) => (
  <OverflowTooltip title={title}>
    <SearchResultPrimaryTitleText noWrap variant="h6">
      <Link
        component={NavLink}
        to={url}
        underline="hover"
        onClick={(event) => {
          event.stopPropagation()
          onLinkClick?.()
        }}
      >
        {title}
      </Link>
    </SearchResultPrimaryTitleText>
  </OverflowTooltip>
))

SearchResultPrimaryTitle.displayName = 'SearchResultPrimaryTitle'

export const SearchResultListRoot = styled(Box)({
  width: CONTENT_WIDTH,
  position: 'relative',
})

export const SearchResultRowRoot = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}))

export const SearchResultRowSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

export const SearchResultListSentinel = styled(Box)({
  height: INFINITE_SCROLL_SENTINEL_HEIGHT,
})

export const SearchResultSecondaryText = styled(Typography)(({ theme }) => ({
  ...theme.typography.subtitle2,
}))

const SearchResultMetaLabel = styled(Typography)(({ theme }) => ({
  ...theme.typography.subtitle2,
  color: theme.palette.text.primary,
}))

const SearchResultPrimaryTitleText = styled((props: TypographyProps) => <Typography component="span" {...props} />)({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  width: 'inherit',
  '& a:hover': {
    cursor: 'pointer',
  },
})

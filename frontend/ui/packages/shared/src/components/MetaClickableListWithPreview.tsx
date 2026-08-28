import { Box, Divider, Skeleton } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { Path } from '@remix-run/router'
import type { ResizeCallback } from 're-resizable'
import { Resizable } from 're-resizable'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useRef } from 'react'

import type { Key } from '../entities/keys'
import { useIntersectionObserver } from '../hooks/common/useIntersectionObserver'
import { isNotEmpty } from '../utils/arrays'
import { CustomListItemButton, LIST_ITEM_SIZE_BIG } from './CustomListItemButton'
import { ListBox } from './Panels/ListBox'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from './Placeholder'

export type FetchNextMetaList = () => void

export type MetaClickableListWithPreviewProps<TItem> = {
  items: ReadonlyArray<TItem>
  getItemKey: (item: TItem) => Key
  renderTitle: (item: TItem, link?: Partial<Path>) => ReactNode
  prepareLinkFn?: (item: TItem) => Partial<Path>
  fetchNextPage?: FetchNextMetaList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  onRowClick?: (itemKey: Key) => void
  isLoading?: boolean
  previewComponent?: ReactNode
  selectedItemKey?: Key
  initialSize: number
  handleResize?: ResizeCallback
  maxWidth: number
  emptyMessage?: string
  emptyListPlaceholder?: ReactNode
  listOverride?: ReactNode
}

function MetaClickableListWithPreviewComponent<TItem>({
  items,
  getItemKey,
  renderTitle,
  prepareLinkFn,
  onRowClick,
  hasNextPage,
  isNextPageFetching,
  fetchNextPage,
  isLoading = false,
  previewComponent,
  selectedItemKey,
  initialSize,
  handleResize,
  maxWidth,
  emptyMessage = 'No items',
  emptyListPlaceholder,
  listOverride,
}: MetaClickableListWithPreviewProps<TItem>): JSX.Element {
  const handleRowClick = useCallback((item: TItem) => {
    onRowClick?.(getItemKey(item))
  }, [getItemKey, onRowClick])

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  const itemList = useMemo(
    () =>
      items.map(item => {
        const itemKey = getItemKey(item)
        const link = prepareLinkFn?.(item)
        const title = renderTitle(item, link)

        return (
          <MetaItemButton
            key={itemKey}
            itemKey={itemKey}
            item={item}
            title={title}
            onClick={handleRowClick}
            selected={selectedItemKey === itemKey}
          />
        )
      }),
    [getItemKey, handleRowClick, items, prepareLinkFn, renderTitle, selectedItemKey],
  )

  const isListContentVisible = isNotEmpty(items) || isLoading

  return (
    <ListGrid>
      <ListBox>
        {isListContentVisible
          ? (
            <Placeholder sx={{ width: 'inherit' }} invisible area={NAVIGATION_PLACEHOLDER_AREA} message={emptyMessage}>
              <ScrollBox>
                {listOverride ?? itemList}
                {isLoading && <ListSkeleton />}
                {hasNextPage && (
                  <Box ref={ref}>
                    <Skeleton variant="rectangular" width="100%" />
                  </Box>
                )}
              </ScrollBox>
            </Placeholder>
          )
          : (
            emptyListPlaceholder ?? (
              <Placeholder
                invisible={false}
                area={NAVIGATION_PLACEHOLDER_AREA}
                message={emptyMessage}
                data-testid="NoItemsPlaceholder"
              />
            )
          )}
      </ListBox>

      <PreviewPanel>
        <Resizable
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: true,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          handleStyles={{
            left: {
              cursor: 'ew-resize',
            },
          }}
          boundsByDirection={true}
          size={{ width: initialSize, height: '100%' }}
          maxWidth={maxWidth}
          onResizeStop={handleResize}
        >
          <PreviewContent>{previewComponent}</PreviewContent>
        </Resizable>
      </PreviewPanel>
    </ListGrid>
  )
}

export const MetaClickableListWithPreview = memo(
  MetaClickableListWithPreviewComponent,
) as typeof MetaClickableListWithPreviewComponent
;(MetaClickableListWithPreview as { displayName?: string }).displayName = 'MetaClickableListWithPreview'

type MetaItemButtonProps<TItem> = {
  itemKey: Key
  item: TItem
  title: ReactNode
  onClick: (item: TItem) => void
  selected: boolean
}

function MetaItemButton<TItem>({
  itemKey,
  item,
  title,
  onClick,
  selected,
}: MetaItemButtonProps<TItem>): JSX.Element {
  return (
    <>
      <CustomListItemButton<TItem>
        keyProp={itemKey}
        data={item}
        itemComponent={title}
        onClick={onClick}
        size={LIST_ITEM_SIZE_BIG}
        isSelected={selected}
      />
      <Divider orientation="horizontal" variant="fullWidth" />
    </>
  )
}

const ListSkeleton: FC = memo(() => {
  return (
    <Box>
      {[...Array(5)].map((_, index) => (
        <Box key={index} mb={2}>
          <Skeleton variant="rectangular" height={20} width="100%" />
        </Box>
      ))}
    </Box>
  )
})

ListSkeleton.displayName = 'ListSkeleton'

const ListGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  height: 'inherit',
})

const ScrollBox = styled(Box)({
  overflow: 'auto',
  height: 'inherit',
})

const PreviewPanel = styled(Box)(({ theme }) => ({
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  height: 'inherit',
  minHeight: 0,
}))

const PreviewContent = styled(Box)({
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
})

import DoNotDisturbAltOutlinedIcon from '@mui/icons-material/DoNotDisturbAltOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { DocumentErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/DocumentErrorIndicator'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DEFAULT_TEXT_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import { type FC, memo, type MouseEvent, useCallback, useState } from 'react'

import type { Documents } from '@portal/entities/documents'

export const EMPTY_DOCUMENT_OPTION = '#empty-document'

export type DocumentSelection = Key | typeof EMPTY_DOCUMENT_OPTION

const CAPTION_LABEL = 'Document:'

const EMPTY_OPTION_TITLE = 'Empty'

const CHEVRON_STYLE = { color: DEFAULT_TEXT_COLOR } as const

const EMPTY_ICON_STYLE = { width: 20, height: 20, color: DEFAULT_TEXT_COLOR } as const

const DOCUMENT_NAME_STYLE = { fontWeight: 600 } as const

export type DocumentSelectorProps = {
  options: Documents
  selected: DocumentSelection
  fallbackTitle: string
  onSelect: (selected: DocumentSelection) => void
}

export const DocumentSelector: FC<DocumentSelectorProps> = memo<DocumentSelectorProps>(({
  options,
  selected,
  fallbackTitle,
  onSelect,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()

  const closeMenu = useCallback(() => setAnchor(undefined), [])

  const stopPropagation = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }, [])

  const handleSelect = useCallback((event: MouseEvent<HTMLElement>, value: DocumentSelection) => {
    event.stopPropagation()
    setAnchor(undefined)
    onSelect(value)
  }, [onSelect])

  const isEmptySelected = selected === EMPTY_DOCUMENT_OPTION
  const selectedDocument = options.find(({ slug }) => slug === selected)
  const title = isEmptySelected
    ? EMPTY_OPTION_TITLE
    : selectedDocument?.title ?? fallbackTitle

  return (
    <SelectorButton
      variant="text"
      onClick={({ currentTarget }) => setAnchor(currentTarget)}
      data-testid="DocumentErrorsDocumentSelectorButton"
    >
      <SelectorContent>
        <CaptionLabel variant="body2">
          {CAPTION_LABEL}
        </CaptionLabel>
        {isEmptySelected
          ? <DoNotDisturbAltOutlinedIcon sx={EMPTY_ICON_STYLE} />
          : <SpecLogo value={selectedDocument?.type} />}
        <TextWithOverflowTooltip
          tooltipText={title}
          variant="body2"
          sx={DOCUMENT_NAME_STYLE}
          data-testid="DocumentErrorsSubtitle"
        >
          {title}
        </TextWithOverflowTooltip>
        <KeyboardArrowDownOutlinedIcon fontSize="small" sx={CHEVRON_STYLE} />
      </SelectorContent>

      <MenuButtonItems
        anchorEl={anchor}
        open={!!anchor}
        onClick={stopPropagation}
        onClose={closeMenu}
      >
        <MenuContent>
          <List>
            <ListItem sx={{ p: 0 }}>
              <DocumentItemButton
                selected={isEmptySelected}
                onClick={event => handleSelect(event, EMPTY_DOCUMENT_OPTION)}
                data-testid="DocumentErrorsEmptyDocumentButton"
              >
                <DocumentItemIcon>
                  <DoNotDisturbAltOutlinedIcon sx={EMPTY_ICON_STYLE} />
                </DocumentItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {EMPTY_OPTION_TITLE}
                    </Typography>
                  }
                />
              </DocumentItemButton>
            </ListItem>

            {options.map(({ slug, title: documentTitle, type, hasErrors }) => (
              <ListItem key={slug} sx={{ p: 0 }}>
                <DocumentItemButton
                  selected={slug === selected}
                  onClick={event => handleSelect(event, slug)}
                  data-testid="DocumentErrorsDocumentButton"
                >
                  <DocumentItemIcon>
                    <SpecLogo value={type} />
                  </DocumentItemIcon>
                  <ListItemText
                    primary={
                      <TextWithOverflowTooltip tooltipText={documentTitle} variant="body2">
                        {documentTitle}
                      </TextWithOverflowTooltip>
                    }
                  />
                  <MenuItemErrorIndicator hasErrors={hasErrors} showTooltip={false} />
                </DocumentItemButton>
              </ListItem>
            ))}
          </List>
        </MenuContent>
      </MenuButtonItems>
    </SelectorButton>
  )
})

DocumentSelector.displayName = 'DocumentSelector'

const SelectorButton = styled(Button)({
  justifyContent: 'flex-start',
  minWidth: 4,
  height: 20,
  padding: 0,
  margin: 0,
  color: DEFAULT_TEXT_COLOR,
  boxShadow: 'none',
  textTransform: 'none',
  '&:hover': {
    boxShadow: 'none',
    backgroundColor: 'transparent',
  },
})

const SelectorContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
})

const DocumentItemButton = styled(ListItemButton)({
  flexDirection: 'unset',
  alignItems: 'center',
  height: 36,
  '&.Mui-selected': {
    backgroundColor: '#ECEDEF',
  },
})

const DocumentItemIcon = styled(ListItemIcon)({
  minWidth: 2,
  marginTop: 0,
  marginRight: 8,
})

const MenuItemErrorIndicator = styled(DocumentErrorIndicator)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}))

const MenuContent = styled(Box)({
  width: 300,
  maxHeight: 300,
  overflowY: 'auto',
})

const CaptionLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 400,
  color: theme.palette.text.secondary,
  flexShrink: 0,
}))

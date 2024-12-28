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

import type { ReactNode } from 'react'
import { type FC, memo, useMemo } from 'react'
import { Box, CircularProgress, Tab, Typography } from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import type { Key } from '../../entities/keys'
import { useStateWithExternal } from '../../hooks/common/useStateWithExternal'
import { genericMemo } from '../../utils/components'

export type TabItem<T extends Key> = {
  key: T
  name: string
  isLoading?: boolean
  info?: ReactNode
}

export type PanelItem<T extends Key> = {
  key: T
  content: ReactNode
}

export type TabsPanelProps<T extends Key> = {
  tabs: ReadonlyArray<TabItem<T>>
  panels: ReadonlyArray<PanelItem<T>>
  activeTab: T
  separator?: boolean
  onChangeTab?: (tab: T) => void
}

// First Order Component //
function TabsPanelRenderer<T extends Key>({
  tabs,
  panels,
  activeTab,
  separator = false,
  onChangeTab,
}: TabsPanelProps<T>): JSX.Element {
  const [internalActiveTab, setInternalActiveTab] = useStateWithExternal(activeTab, activeTab, onChangeTab)
  const tabListStyles = useMemo(() => (separator
      ? { borderBottom: 1, borderColor: 'divider' }
      : undefined
  ), [separator])

  return (
    <Box
      height="100%"
      width="100%"
      overflow="hidden"
    >
      <TabContext value={internalActiveTab}>
        <TabList
          sx={tabListStyles}
          onChange={(_, value) => setInternalActiveTab(value)}
        >
          {
            tabs.map(({ key, name, isLoading, info }) => (
              <Tab
                value={key}
                label={
                  <TabLabel
                    name={name}
                    isLoading={isLoading}
                    info={info}
                  />
                }
                data-testid={`TabButton-${key}`}
              />
            ))
          }
        </TabList>
        {
          panels.map(({ key, content }) => (
            <TabPanel value={key} sx={tabPanelStyle}>
              {content}
            </TabPanel>
          ))
        }
      </TabContext>
    </Box>
  )
}

export const TabsPanel = genericMemo(TabsPanelRenderer)

type TabLabelProps = {
  name: string
  isLoading?: boolean
  info?: ReactNode
}

const TabLabel: FC<TabLabelProps> = memo<TabLabelProps>(({
  name,
  info,
  isLoading = false,
}) => {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant="subtitle1">{name}</Typography>
      {isLoading ? <CircularProgress size={14}/> : info}
    </Box>
  )
})

const tabPanelStyle = { width: '100%', maxHeight: '100%', overflow: 'auto' }

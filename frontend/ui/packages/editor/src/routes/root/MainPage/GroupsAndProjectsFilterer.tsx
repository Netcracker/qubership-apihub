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
import { memo } from 'react'
import { Paper, ToggleButton, ToggleButtonGroup } from '@mui/material'
import ListOutlinedIcon from '@mui/icons-material/ListOutlined'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import { FAVORITE_MAIN_PAGE_MODE, FLAT_MAIN_PAGE_MODE, TREE_MAIN_PAGE_MODE, useMainPageMode } from './useMainPageMode'
import { useTextSearchParam } from '../useTextSearchParam'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { TreeIcon } from '@netcracker/qubership-apihub-ui-shared/icons/TreeIcon'

export const GroupsAndProjectsFilterer: FC = memo(() => {
  const [textFilter] = useTextSearchParam()
  const setSearchParams = useSetSearchParams()
  const [mainViewMode, setMainViewMode] = useMainPageMode()

  return (
    <>
      <SearchBar
        placeholder="Search project"
        value={textFilter}
        onValueChange={text => {
          setSearchParams({ text: text, view: text === '' ? mainViewMode : FLAT_MAIN_PAGE_MODE }, { replace: true })
        }}
      />
      <Paper
        sx={{
          backgroundColor: '#F2F3F5',
          borderRadius: 2,
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        <ToggleButtonGroup
          sx={{ height: 32 }}
          size="small"
          value={mainViewMode}
          exclusive
          onChange={(_, newAlignment) => {
            if (newAlignment !== null) {
              setMainViewMode(newAlignment)
              setSearchParams({ view: newAlignment }, { replace: true })
            }
          }}
        >
          <ToggleButton value={TREE_MAIN_PAGE_MODE}>
            <TreeIcon/>
          </ToggleButton>
          <ToggleButton value={FLAT_MAIN_PAGE_MODE}>
            <ListOutlinedIcon/>
          </ToggleButton>
          <ToggleButton value={FAVORITE_MAIN_PAGE_MODE}>
            <StarOutlineRoundedIcon/>
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>
    </>
  )
})

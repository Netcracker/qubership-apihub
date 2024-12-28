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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useEvent } from 'react-use'
import { SHOW_IMPORT_FROM_GIT_DIALOG } from '../../../../../../EventBusProvider'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import FolderIcon from '@mui/icons-material/Folder'
import { LoadingButton, TabContext, TabPanel, TreeItem, TreeView } from '@mui/lab'

import { useGitFilesNext, useImportFromGit } from './useImportFromGit'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { TreeGitFile } from '@apihub/utils/trees'
import { buildGitFileTree } from '@apihub/utils/trees'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'

export const ImportFromGitDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  useEvent(SHOW_IMPORT_FROM_GIT_DIALOG, ({ detail }) => {
    if (detail) {
      const { folderKey } = detail
      loadFolders(folderKey).then((folderKeys) => {
        setLoaded(prevState => [...new Set([...prevState, ...folderKeys])])
        setExpanded(folderKeys)
      })
    }

    setOpen(true)
  })

  const [selected, setSelected] = useState<Key[]>([])
  const [expanded, setExpanded] = useState<Key[]>([])
  const [loaded, setLoaded] = useState<Key[]>([])

  const [importFromGit, isLoading] = useImportFromGit()
  const [gitFiles, fetchFolder] = useGitFilesNext()

  const reset = useCallback(
    () => {
      setSelected([])
      setExpanded([])
      setOpen(false)
    },
    [],
  )

  useEffect(() => {!isLoading && reset()}, [isLoading, reset])

  const handleToggle = useCallback(
    (keys: Key[]): void => {
      setExpanded(prevState => {
        const [expandedFolderPath] = keys.filter(id => !prevState.includes(id))
        setLoaded(prevState => [...prevState, expandedFolderPath])
        if (!loaded.includes(expandedFolderPath)) {
          fetchFolder({ pageParam: expandedFolderPath }).then()
        }
        return keys
      })
    },
    [fetchFolder, loaded],
  )

  const fileTree = useMemo(
    () => buildGitFileTree(gitFiles),
    [gitFiles],
  )

  const handleSelection = useCallback(
    (checked: boolean, fileKey: Key, children?: TreeGitFile[]): void => {
      const additionalKeys = getNonFolderFileKeys(children ?? [])
      setSelected(prevState => {
        return checked
          ? [...prevState, fileKey, ...additionalKeys]
          : prevState.filter(key => key !== fileKey && !additionalKeys.includes(key))
      })
    },
    [],
  )

  const handleFolderSelection = useCallback(
    (checked: boolean, folderKey: Key): void => {
      setSelected(prevState => {
        return checked
          ? [...prevState, folderKey]
          : prevState.filter(key => key !== folderKey)
      })
    },
    [],
  )

  const loadFolders = async (folderKey: Key): Promise<Key[]> => {
    const folderKeys: Key[] = []
    folderKey.match(/\/?[^/]+/g)
      ?.reduce((previousValue: string, currentValue: string) => {
        const path = `${previousValue}${currentValue}`
        folderKeys.push(path)
        return path
      }, '')

    for (const key of folderKeys) {
      if (!loaded.includes(key)) {
        await fetchFolder({ pageParam: key })
      }
    }

    return folderKeys
  }

  const renderTree = useCallback((fileTree: TreeGitFile[]) => fileTree.map(({
    children,
    isFolder,
    key,
    name,
  }: TreeGitFile) => {
    const nonFolderKeys = getNonFolderFileKeys(children ?? [])
    const selectedNonFolderKeys = selected.filter(selectedKey => nonFolderKeys.includes(selectedKey))

    const someChildrenSelected = nonFolderKeys.some(key => !selectedNonFolderKeys.includes(key))
    const folderCheckboxAvailable = isFolder && loaded.includes(key) && expanded.includes(key) && isNotEmpty(nonFolderKeys)

    return (
      <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {folderCheckboxAvailable && (
          <Checkbox
            sx={{ p: 0 }}
            checked={isEmpty(selectedNonFolderKeys) ? false : !someChildrenSelected}
            indeterminate={isEmpty(selectedNonFolderKeys) ? false : someChildrenSelected}
            onChange={(_, checked) => handleSelection(checked, key, children ?? [])}
          />
        )}
        <TreeItem
          nodeId={key}
          icon={!isFolder && (
            <Checkbox
              sx={{ p: 0 }}
              checked={selected.some(selectedKey => selectedKey === key)}
              onChange={(_, checked) => handleSelection(checked, key)}
            />
          )}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isFolder
                ? <FolderIcon sx={{ color: '#FFB02E' }} fontSize="small"/>
                : <FileIcon/>}
              <Typography noWrap variant="body2">{name}</Typography>
            </Box>
          }
        >
          {isFolder && children && expanded.some(expandedKey => expandedKey === key)
            ? renderTree(children)
            : <Box/>}
        </TreeItem>
      </Box>
    )
  }), [selected, loaded, expanded, handleSelection])

  const renderFolderTree = useCallback((fileTree: TreeGitFile[]) => fileTree.filter(({ isFolder }) => isFolder).map(({
    children,
    isFolder,
    key,
    name,
  }: TreeGitFile) => {
    return (
      <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <TreeItem
          nodeId={key}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                sx={{ p: 0 }}
                checked={selected.includes(key)}
                onChange={(_, checked) => handleFolderSelection(checked, key)}
              />
              <FolderIcon sx={{ color: '#FFB02E' }} fontSize="small"/>
              <Typography noWrap variant="body2">{name}</Typography>
            </Box>
          }
        >
          {isFolder && children && expanded.some(expandedKey => expandedKey === key)
            ? renderFolderTree(children)
            : <Box/>}
        </TreeItem>
      </Box>
    )
  }), [selected, expanded, handleFolderSelection])

  const [activeTab, setActiveTab] = useState<ImportFromGitDialogMode>(FILES_TAB)
  const handleChange = useCallback((_: React.SyntheticEvent, value: ImportFromGitDialogMode) => {
    setActiveTab(value)
  }, [])

  const processImport = useCallback(() => {
    const importFolders = activeTab === FOLDERS_TAB
    const filePaths = gitFiles.filter(item => importFolders || !item.isFolder)
      .map(({ key }) => key)
      .filter(value => selected.includes(value))
      .map(key => `${key}${importFolders ? '/' : ''}`)

    importFromGit(filePaths)
  }, [activeTab, gitFiles, importFromGit, selected])

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>
        Import From GIT
      </DialogTitle>

      <DialogContent sx={{ height: 350, pb: 0 }}>
        <TabContext value={activeTab}>
          <Tabs value={activeTab} onChange={handleChange}>
            <Tab label="Files" value={FILES_TAB}/>
            <Tab label="Folders" value={FOLDERS_TAB}/>
          </Tabs>
          {activeTab === FILES_TAB && <TabPanel value={FILES_TAB} tabIndex={0}>
            <Box sx={{ backgroundColor: '#F5F5FA', minHeight: '-webkit-fill-available', borderRadius: 2, p: 1 }}>
              <TreeView
                defaultCollapseIcon={<ExpandMoreOutlinedIcon/>}
                defaultExpandIcon={<ChevronRightOutlinedIcon/>}
                expanded={expanded}
                onNodeToggle={(_, keys) => handleToggle(keys)}
              >
                {renderTree(fileTree)}
              </TreeView>
            </Box>
          </TabPanel>}
          {activeTab === FOLDERS_TAB && <TabPanel value={FOLDERS_TAB} tabIndex={1}>
            <Box sx={{ backgroundColor: '#F5F5FA', minHeight: '-webkit-fill-available', borderRadius: 2, p: 1 }}>
              <TreeView
                defaultCollapseIcon={<ExpandMoreOutlinedIcon/>}
                defaultExpandIcon={<ChevronRightOutlinedIcon/>}
                expanded={expanded}
                onNodeToggle={(_, keys) => handleToggle(keys)}
              >
                {renderFolderTree(fileTree)}
              </TreeView>
            </Box>
          </TabPanel>}
        </TabContext>
      </DialogContent>

      <DialogContent>
        <Alert sx={{ p: 0, pl: 2 }} severity="info">GIT repository structure will be preserved on import</Alert>
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isLoading} onClick={processImport}>
          Import
        </LoadingButton>
        <Button variant="outlined" onClick={reset}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
})

function getNonFolderFileKeys(files: TreeGitFile[]): Key[] {
  return files
    .filter(({ isFolder }) => !isFolder)
    .map(({ key }) => key) ?? []
}

const FOLDERS_TAB = 'folders'
const FILES_TAB = 'files'
type ImportFromGitDialogMode =
  | typeof FOLDERS_TAB
  | typeof FILES_TAB

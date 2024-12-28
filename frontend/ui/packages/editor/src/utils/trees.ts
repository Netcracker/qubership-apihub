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

import type { GitFile } from '@apihub/entities/git-files'
import type { ProjectFile } from '@apihub/entities/project-files'
import { UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { UNMODIFIED_CHANGE_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { alphabeticallyBy } from '@netcracker/qubership-apihub-ui-shared/utils/comparers'

export type TreeGitFile = TreeFile<GitFile>
export type TreeProjectFile = TreeFile<ProjectFile>

export type TreeFile<T extends ProjectFile | GitFile> = T & {
  children?: TreeFile<T>[]
}

export function buildProjectFileTree(
  flatTree: ReadonlyArray<ProjectFile>,
): Array<TreeProjectFile> {
  const flatTreeFiles: TreeProjectFile[] = [...flatTree]
    .sort(naturalFileComparator)

  const tree: TreeProjectFile[] = []

  flatTreeFiles.forEach(file => {
    const { name, key: path } = file
    const pathParts = path ? splitPath(file) : []

    let current: TreeProjectFile[] = tree
    const folders: string[] = []
    pathParts.forEach(part => {
      folders.push(part)
      const existingNode: TreeProjectFile | undefined = current.find(treeFile => treeFile.name === part)
      if (existingNode) {
        current = existingNode.children ?? tree
      } else if (name !== part) {
        const folderPath = folders.join('/')
        const folder: TreeProjectFile = {
          key: folderPath,
          name: part,
          format: UNKNOWN_FILE_FORMAT,
          status: UNMODIFIED_CHANGE_STATUS,
          children: [],
        }
        current.push(folder)
        current = folder.children!
      } else {
        current.push(file)
        current = tree
      }
    })
  })
  return collapseProjectFileTree(tree)
}

export function collapseProjectFileTree(
  tree: TreeProjectFile[],
): TreeProjectFile[] {
  const collapse = (item: TreeProjectFile, level: number): TreeProjectFile => {
    let current = item
    const { key, name, children } = item

    current.children?.forEach((child, index) => {
      if (current.children) {
        current.children[index] = collapse(child, level)
      }
    })

    if (children?.length === 1 && children[0]?.children?.length) {
      const firstChildName = children[0].name
      const folderKey = `${key}/${firstChildName}`
      const folderName = `${name}/${firstChildName}`
      current = {
        key: folderKey,
        name: folderName,
        format: UNKNOWN_FILE_FORMAT,
        status: UNMODIFIED_CHANGE_STATUS,
        children: children[0].children,
      }
    }

    return current
  }

  tree.forEach((item, index) => tree[index] = collapse(item, 1))
  sortAlphabetically(tree)
  return tree
}

export function buildGitFileTree(
  flatTree: ReadonlyArray<GitFile>,
): TreeGitFile[] {
  const flatTreeFiles: TreeGitFile[] = flatTree.map(gitFile => ({ ...gitFile, ...gitFile.isFolder ? { children: [] } : {} }))

  const tree: TreeGitFile[] = []

  flatTreeFiles.forEach(file => {
    const pathParts = file.path ? splitPath(file) : []

    let current: TreeGitFile[] = tree

    pathParts.forEach(part => {
      const existingNode: TreeGitFile | undefined = current.find(treeFile => treeFile.name === part)
      if (existingNode) {
        current = existingNode.children ?? tree
      } else if (file.isFolder) {
        current.push(file)
        current = file.children ?? tree
      }
    })

    if (!file.isFolder && !current.find(item => item.key === file.key)) {
      current.push(file)
      current = tree
    }
  })

  return tree
}

export function getFileById<T extends ProjectFile | GitFile>(
  file: TreeFile<T>,
  key: Key,
  parents?: TreeFile<T>[],
): TreeFile<T> | null {
  let result = null

  if (file.key === key) {
    return file
  } else if (Array.isArray(file.children)) {
    for (const childFile of file.children) {
      result = getFileById(childFile, key, parents)
      if (result) {
        parents && parents.push(file)
        return result
      }
    }
    return result
  }
  return result
}

export function getRelatives<T extends ProjectFile | GitFile>(
  key: Key,
  files: TreeFile<T>,
): Relatives<T> {
  const children: TreeFile<T>[] = []
  const parents: TreeFile<T>[] = []
  const fileToToggle = getFileById(files, key, parents)

  return {
    children: getNestedChildren(fileToToggle, children),
    parents: parents.filter(node => !!node.key),
  }
}

function getNestedChildren<T extends ProjectFile | GitFile>(
  child: TreeFile<T> | null,
  collectedChildren: TreeFile<T>[] = [],
): TreeFile<T>[] {
  if (child === null) {
    return collectedChildren
  }

  collectedChildren.push(child)

  if (Array.isArray(child.children)) {
    for (const file of child.children) {
      getNestedChildren(file, collectedChildren)
    }
  }

  return collectedChildren
}

function splitPath<T extends ProjectFile | GitFile>(
  value: TreeFile<T>,
): string[] {
  return value.key.split('/')
}

type Relatives<T extends ProjectFile | GitFile> = {
  children: TreeFile<T>[]
  parents: TreeFile<T>[]
}

const naturalFileComparator = (it: ProjectFile, that: ProjectFile): number => {
  const a = splitPath(that).length
  const b = splitPath(it).length
  return a < b
    ? -1
    : a > b
      ? 1
      : alphabeticallyBy('name', it, that)
}

function sortAlphabetically(fileTree: TreeProjectFile[]): void {
  if (fileTree.length === 1 && fileTree[0].children) {
    sortAlphabetically(fileTree[0].children)
  }

  fileTree.sort((a, b) => {
    if (a.children) {
      sortAlphabetically(a.children)
    }
    if (b.children) {
      sortAlphabetically(b.children)
    }
    return a.children && b.children
      ? alphabeticallyBy('name', a, b)
      : 0
  })
}

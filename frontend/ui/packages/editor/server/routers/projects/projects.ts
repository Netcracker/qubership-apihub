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

import type { Router } from 'express'
import { PROJECTS, PUBLISHED_PROJECT_IDS } from '../../mocks/projects/projects'
import { BRANCH_CONFIG, BRANCH_CONFLICTS, BRANCHES, LAST_FILE_CHANGE_STATUSES } from '../../mocks/projects/branches'
import { GIT_FILES } from '../../mocks/projects/git-files'
import { PUBLISHED_VERSION_CONTENTS } from '../../mocks/projects/version-contents'
import {
  MARKDOWN_SPEC,
  MARKDOWN_SPEC_RAW,
  OPENAPI_3_0_SPEC_RAW,
  OPENAPI_SPEC,
} from '../../mocks/projects/published-specs'
import { FILE_HISTORY } from '../../mocks/projects/history'
import fs from 'fs'
import path from 'path'
import {
  ADD_OPERATION,
  ADDED_CHANGE_TYPE,
  NONE_CHANGE_TYPE,
  PATCH_OPERATION,
  UPDATED_CHANGE_TYPE,
} from '../../../src/entities'
import type { Server } from 'ws'
import type { Socket } from '../../types'
import type { WithWebsocketMethod } from 'express-ws'
import { SUPERUSER } from '../../mocks/auth/users'
import { VERSIONS } from '../../mocks/projects/versions'
import {
  ADDED_CHANGE_STATUS,
  DELETED_CHANGE_STATUS,
  EXCLUDED_CHANGE_STATUS,
  MODIFIED_CHANGE_STATUS,
  MOVED_CHANGE_STATUS,
  UNMODIFIED_CHANGE_STATUS,
} from '../../mocks/projects/types'

export function getProjects(router: Router): void {
  router.get('/', (req, res) => {
    const { projectId, groupId, onlyPublished, onlyFavorite, textFilter } = req.query
    let { projects } = PROJECTS

    if (projectId) {
      projects = projects.filter(project => project.projectId === projectId)
    }
    if (groupId) {
      projects = projects.filter(project => project.groupId === groupId)
    }
    if (onlyPublished === 'true') {
      projects = projects.filter(({ projectId }) => PUBLISHED_PROJECT_IDS.has(projectId))
    }
    if (onlyFavorite === 'true') {
      projects = projects.filter(project => project.isFavorite)
    }
    if (textFilter) {
      projects = projects.filter(({ projectId, name }) => {
        const search = (value: string): boolean => value.toLowerCase().includes((textFilter as string).toLowerCase())
        return search(name) || search(projectId)
      })
    }

    res.status(200).json({ projects })
  })
}

export function getProject(router: Router): void {
  router.get('/:id/', (req, res) => {
    res.status(200).json(PROJECTS.projects.find(project => project.projectId === req.params.id))
  })
}

export function getBranches(router: Router): void {
  router.get('/:id/branches/', (req, res) => {
    const { filter } = req.query
    let { branches } = BRANCHES
    if (filter) {
      branches = branches.filter(({ name }) => name.toLowerCase().includes((filter as string).toLowerCase()))
    }
    res.status(200).json({ branches })
  })
}

export function getBranchConflicts(router: Router): void {
  router.get('/:id/branches/:branchId/conflicts', (req, res) => {
    res.status(200).json(BRANCH_CONFLICTS)
  })
}

export function getBranchGitConfig(router: Router): void {
  router.get('/:id/branches/:branchId/config', (req, res) => {
    res.contentType('text/plain')
    res.status(200).send(getFileContent('branch-git-config.json'))
  })
}

// TODO: Seems redundant. Check
export function updateBranchConfig(router: Router): void {
  router.put('/:id/branches/:branchId/', (req, res) => {
    BRANCH_CONFIG.files = req.body.files
    res.status(200).json()
  })
}

export function getGitFiles(router: Router): void {
  router.get('/:id/branches/:branchId/integration/files/', (req, res) => {
    const { path } = req.query
    res.status(200).json(GIT_FILES[path as string])
  })
}

export function getProjectFileContent(router: Router): void {
  router.get('/:id/branches/:branchId/files/:fileId/', (req, res) => {
    res.contentType('text/plain')
    res.status(200).send(getFileContent(req.params.fileId))
  })
}

// TODO: Seems redundant. Check
export function updateProjectFileContent(router: Router): void {
  router.put('/:id/branches/:branchId/files/:fileId/', (req, res) => {
    try {
      fs.writeFileSync(path.join(__dirname, `../../mocks/file-contents/${req.params.fileId}`), req.body)
    } catch (err) {
      if (req.params.fileId.includes('.json')) {
        fs.writeFileSync(path.join(__dirname, '../../mocks/file-contents/api.json'), req.body)
      } else {
        fs.writeFileSync(path.join(__dirname, '../../mocks/file-contents/sample.postman_collection.yaml'), req.body)
      }
    }
    res.status(200).send()
  })
}

export function resetFile(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/files/:fileId/reset', (req, res) => {
    const files = [...BRANCH_CONFIG.files]
    const { fileId } = req.params

    BRANCH_CONFIG.files = files.map((file) => {
      if (file.fileId === fileId) {
        return {
          ...file,
          status: UNMODIFIED_CHANGE_STATUS,
        }
      }
      return file
    })

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:files:reset',
        userId: s.id,
        fileId: fileId,
      }))
    })

    res.status(200).send()
  })
}

export function deleteFile(router: Router & WithWebsocketMethod, wss: Server): void {
  router.delete('/:id/branches/:branchId/files/:fileId/', (req, res) => {
    const files = [...BRANCH_CONFIG.files]
    const { fileId } = req.params

    BRANCH_CONFIG.files = files.map((file) => {
      if (file.fileId === fileId) {
        return {
          ...file,
          status: DELETED_CHANGE_STATUS,
        }
      }
      return file
    })

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:files:updated',
        userId: s.id,
        fileId: fileId,
        operation: PATCH_OPERATION,
        data: {
          status: DELETED_CHANGE_STATUS,
        },
      }))
    })

    res.status(200).send()
  })
}

export function restoreFile(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/files/:fileId/restore', (req, res) => {
    const files = [...BRANCH_CONFIG.files]
    const { fileId } = req.params

    BRANCH_CONFIG.files = files.map((file) => {
      if (file.fileId === fileId) {
        return {
          ...file,
          status: LAST_FILE_CHANGE_STATUSES.get(fileId) ?? UNMODIFIED_CHANGE_STATUS,
        }
      }
      return file
    })

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:files:updated',
        userId: s.id,
        operation: PATCH_OPERATION,
        fileId: fileId,
        data: {
          changeType: UPDATED_CHANGE_TYPE,
          status: LAST_FILE_CHANGE_STATUSES.get(fileId),
        },
      }))
    })

    res.status(200).send()
  })
}

export function deleteVersion(router: Router): void {
  router.delete('/:id/versions/:versionId/', (req, res) => {
    const versions = [...VERSIONS.versions]
    const { versionId } = req.params

    VERSIONS.versions = versions.filter((projectVersion) => projectVersion.version !== versionId)

    res.status(200).send()
  })
}

export function updateFileMeta(router: Router & WithWebsocketMethod, wss: Server): void {
  router.patch('/:id/branches/:branchId/files/:fileId/meta', (req, res) => {
    const { fileId } = req.params
    const { publish, labels } = req.body
    const { bulk } = req.query
    const files = [...BRANCH_CONFIG.files]

    if (bulk) {
      const updatedFiles = files.filter(file => file.fileId.startsWith(fileId))
      BRANCH_CONFIG.files = [
        ...files,
        ...updatedFiles.map(file => ({ ...file, publish })),
      ]

      wss.clients.forEach((s: Socket) => {
        updatedFiles.forEach(({ fileId }) => {
          s.send(JSON.stringify({
            type: 'branch:files:updated',
            userId: s.id,
            fileId: fileId,
            operation: PATCH_OPERATION,
            data: { publish, labels },
          }))
        })
      })
    } else {
      BRANCH_CONFIG.files = files.map(file => (file.fileId === fileId ? { ...file, publish, labels } : file))

      wss.clients.forEach((s: Socket) => {
        s.send(JSON.stringify({
          type: 'branch:files:updated',
          userId: s.id,
          fileId: fileId,
          operation: PATCH_OPERATION,
          data: { publish, labels },
        }))
      })
    }

    res.status(200).send()
  })
}

export function renameFile(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/files/:fileId/rename/', (req, res) => {
    const { newFileId } = req.body
    const parts = newFileId.split('/')
    const files = [...BRANCH_CONFIG.files]
    const { fileId } = req.params

    BRANCH_CONFIG.files = files.map(file => {
      if (file.fileId === fileId) {
        return ({
          ...file,
          fileId: newFileId,
          name: parts[parts.length - 1],
          path: newFileId,
          status: MODIFIED_CHANGE_STATUS,
        })
      }
      return file
    })

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:files:updated',
        userId: s.id,
        fileId: fileId,
        operation: PATCH_OPERATION,
        data: {
          fileId: newFileId,
          changeType: UPDATED_CHANGE_TYPE,
          status: MOVED_CHANGE_STATUS,
          movedFrom: fileId,
        },
      }))
    })

    res.status(200).send()
  })
}

export function importFromGit(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/integration/files/', (req, res) => {
    const { source, data } = req.body
    const files = [...BRANCH_CONFIG.files]

    if (source === 'new') {
      const { name, path } = data
      const fileId = `${path ? `${path}/` : ''}${name}`
      files.push({
        status: UNMODIFIED_CHANGE_STATUS,
        fileId: fileId,
        name: name,
      })

      wss.clients.forEach((s: Socket) => {
        s.send(JSON.stringify({
          type: 'branch:files:updated',
          userId: s.id,
          operation: ADD_OPERATION,
          data: {
            fileId: fileId,
            status: ADDED_CHANGE_STATUS,
            changeType: ADDED_CHANGE_TYPE,
          },
        }))
      })
    }

    BRANCH_CONFIG.files = files

    res.status(200).send()
  })
}

export function saveChanges(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/save/', (req, res) => {
    const { comment, branch, createMergeRequest } = req.body
    const files = [...BRANCH_CONFIG.files]

    BRANCH_CONFIG.files = files.filter(({ status }) => status !== DELETED_CHANGE_STATUS && status !== EXCLUDED_CHANGE_STATUS)

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:saved',
        userId: s.id,
        comment: comment,
        branch: branch,
        mrUrl: createMergeRequest ? 'https://git.example.com/user1234/repositoryABC/-/merge_requests/1' : undefined,
      }))
    })

    res.status(200).json()
  })
}

export function publishProjectVersion(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/publish/', (req, res) => {
    const { version, status } = req.body

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:published',
        userId: s.id,
        version: version,
        status: status,
      }))
    })
    res.status(200).json()
  })
}

export function enableBranchEditingMode(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/editors/', (req, res) => {
    BRANCH_CONFIG.editors = [SUPERUSER]

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:editors:added',
        userId: SUPERUSER.id,
      }))
    })

    res.status(200).send()
  })
}

export function disableBranchEditingMode(router: Router & WithWebsocketMethod, wss: Server): void {
  router.delete('/:id/branches/:branchId/editors/', (req, res) => {
    BRANCH_CONFIG.editors = []

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:editors:removed',
        userId: SUPERUSER.id,
      }))
    })

    res.status(200).send()
  })
}

export function resetBranch(router: Router & WithWebsocketMethod, wss: Server): void {
  router.post('/:id/branches/:branchId/reset/', (req, res) => {
    const files = [...BRANCH_CONFIG.files]

    BRANCH_CONFIG.files = files.map((file) => {
      return {
        ...file,
        status: UNMODIFIED_CHANGE_STATUS,
      }
    })

    BRANCH_CONFIG.configFileId = 'apihub-config'
    BRANCH_CONFIG.changeType = NONE_CHANGE_TYPE
    BRANCH_CONFLICTS.files = []

    wss.clients.forEach((s: Socket) => {
      s.send(JSON.stringify({
        type: 'branch:reset',
        userId: s.id,
      }))
    })

    res.status(200).send()
  })
}

export function createBranch(router: Router): void {
  router.post('/:id/branches/:branchId/clone/', (req, res) => {
    const { branch } = req.body
    BRANCHES.branches = [
      ...BRANCHES.branches,
      {
        name: branch,
        permissions: ['all'],
      },
    ]

    res.status(200).json()
  })
}

export function getFileHistory(router: Router): void {
  router.get('/:id/branches/:branchId/files/:fileId/history/', (req, res) => {
    res.contentType('application/json')
    res.status(200).send(FILE_HISTORY)
  })
}

export function getFileHistoryByCommit(router: Router): void {
  router.get('/:id/branches/:branchId/files/:fileId/history/:commitId/', (req, res) => {
    res.contentType('text/plain')
    // TODO: Get file content by commit id
    res.status(200).send(getFileContent(req.params.fileId))
  })
}

export function getVersions(router: Router): void {
  router.get('/:id/versions/', (req, res) => {
    const { filter } = req.query
    let { versions } = VERSIONS
    if (filter) {
      versions = versions.filter(({ version }) => {
        const search = (value: string): boolean => value.toLowerCase().includes((filter as string).toLowerCase())
        return search(version)
      })
    }
    res.status(200).json({ versions })
  })
}

export function getVersion(router: Router): void {
  router.get('/:id/versions/:versionId/', (req, res) => {
    res.status(200).json(PUBLISHED_VERSION_CONTENTS.get(req.params.versionId))
  })
}

export function getPublishedSpec(router: Router): void {
  router.get('/:id/versions/:versionId/files/:specId/', (req, res) => {
    if (req.params.specId.endsWith('md')) {
      res.status(200).send(MARKDOWN_SPEC)
      return
    }
    res.status(200).send(OPENAPI_SPEC)
  })
}

export function getPublishedSpecRaw(router: Router): void {
  router.get('/:id/versions/:versionId/files/:specId/raw/', (req, res) => {
    res.contentType('text/plain')
    if (req.params.specId.endsWith('md')) {
      res.status(200).send(MARKDOWN_SPEC_RAW)
      return
    }
    res.status(200).send(OPENAPI_3_0_SPEC_RAW)
  })
}

export function favorProject(router: Router): void {
  router.post('/:id/favor/', (req, res) => {
    PROJECTS.projects = PROJECTS.projects.map(project => {
      return project.projectId === req.params.id
        ? { ...project, isFavorite: true }
        : project
    })
    res.status(200).json()
  })
}

export function disfavorProject(router: Router): void {
  router.post('/:id/disfavor/', (req, res) => {
    PROJECTS.projects = PROJECTS.projects.map(project => {
      return project.projectId === req.params.id
        ? { ...project, isFavorite: false }
        : project
    })
    res.status(200).json()
  })
}

export function createProject(router: Router): void {
  router.post('/', (req, res) => {
    const projects = [...PROJECTS.projects]
    const newProject = {
      ...req.body,
      projectId: `project-${new Date()}`,
    }
    projects.push(newProject)
    PROJECTS.projects = projects
    res.status(200).json(newProject)
  })
}

export function deleteProject(router: Router): void {
  router.delete('/:id/', (req, res) => {
    const projects = [...PROJECTS.projects]
    PROJECTS.projects = projects.filter(({ projectId }) => projectId !== req.params.id)
    res.status(200).json()
  })
}

export function updateProject(router: Router): void {
  router.put('/:id/', (req, res) => {
    const projects = [...PROJECTS.projects]
    PROJECTS.projects = projects.map(project => {
      if (project.projectId === req.params.id) {
        project = { ...req.body }
      }
      return project
    })
    res.status(200).json()
  })
}

export function getFileContent(fileId: string): Buffer {
  try {
    return fs.readFileSync(path.join(__dirname, `../../mocks/file-contents/${fileId}`))
  } catch (err) {
    if (fileId.includes('.json')) {
      return fs.readFileSync(path.join(__dirname, '../../mocks/file-contents/api.json'))
    } else {
      return fs.readFileSync(path.join(__dirname, '../../mocks/file-contents/sample.postman_collection.yaml'))
    }
  }
}

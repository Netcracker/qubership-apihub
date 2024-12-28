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
import { GROUPS } from '../../mocks/groups/groups'

export function getGroups(router: Router): void {
  router.get('/', (req, res) => {
    const { groupId, depth } = req.query
    let { groups } = GROUPS

    if (groupId) {
      groups = groups.filter(group => group.parentId === groupId)
    } else {
      groups = depth === '0' ? groups : groups.filter(group => !group.parentId)
    }

    res.status(200).json({ groups })
  })
}

export function getGroup(router: Router): void {
  router.get('/:id/', (req, res) => {
    res.status(200).json(GROUPS.groups.find(group => group.groupId === req.params.id))
  })
}

export function createGroup(router: Router): void {
  router.post('/', (req, res) => {
    const groups = [...GROUPS.groups]
    groups.push({
      ...req.body,
      groupId: `group-${new Date()}`,
    })
    GROUPS.groups = groups
    res.status(200).json()
  })
}

export function favorGroup(router: Router): void {
  router.post('/:id/favor/', (req, res) => {
    GROUPS.groups = GROUPS.groups.map(group => {
      return group.groupId === req.params.id
        ? { ...group, isFavorite: true }
        : group
    })
    res.status(200).json()
  })
}

export function disfavorGroup(router: Router): void {
  router.post('/:id/disfavor/', (req, res) => {
    GROUPS.groups = GROUPS.groups.map(group => {
      return group.groupId === req.params.id
        ? { ...group, isFavorite: false }
        : group
    })
    res.status(200).json()
  })
}

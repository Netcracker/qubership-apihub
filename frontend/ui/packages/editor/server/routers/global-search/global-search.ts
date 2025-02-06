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
import { RECENTLY_VISITED_PACKAGES } from '../../mocks/global-search/search-result'
import { PROJECTS } from '../../mocks/projects/projects'
import type { PackageSearchResultDto } from '../../mocks/global-search/types'

export function performSearch(router: Router): void {
  router.post('/', (req, res) => {

    const { searchString, packageIds, searchLevel } = req.body

    if (searchString && searchLevel) {
      const data = PROJECTS.projects
        .filter(project => project.name.toLowerCase().includes(searchString.toLowerCase()))
        .filter(project => (packageIds?.[0] ? project.projectId === packageIds[0] : true))

      const packages: PackageSearchResultDto[] = data.map(value => ({
        packageId: value.projectId,
        name: value.name,
        parentPackages: [],
        description: '',
      }))

      res.status(200).json({ packages })
      return
    }

    res.status(200).json(RECENTLY_VISITED_PACKAGES)
  })
}

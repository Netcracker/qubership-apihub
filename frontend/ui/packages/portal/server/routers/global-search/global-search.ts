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
import {
  DOCUMENTS_SEARCH_RESULT,
  OPERATIONS_SEARCH_RESULT,
  PACKAGES_SEARCH_RESULT,
} from '../../mocks/global-search/search-result'

export function performSearch(router: Router): void {
  router.post('/:searchLevel', (req, res) => {
    const { searchString, packageIds } = JSON.parse(req.body)
    const { searchLevel } = req.params

    if (searchString && searchLevel) {
      if (searchLevel === 'package') {
        const searchResult = PACKAGES_SEARCH_RESULT?.packages
          ?.filter(res => res.name.toLowerCase().includes(searchString.toLowerCase()))
          ?.filter(res => (packageIds?.[0] ? res.packageId === packageIds[0] : true))

        res.status(200).json({ packages: searchResult })
        return
      }

      if (searchLevel === 'document') {
        const searchResult = DOCUMENTS_SEARCH_RESULT?.documents
          ?.filter(res => res.name.toLowerCase().includes(searchString.toLowerCase()))

        res.status(200).json({ documents: searchResult })
        return
      }

      if (searchLevel === 'operation') {
        const searchResult = OPERATIONS_SEARCH_RESULT?.operations
          ?.filter(res => res.name.toLowerCase().includes(searchString.toLowerCase()))

        res.status(200).json({ operations: searchResult })
        return
      }
    }
  })
}

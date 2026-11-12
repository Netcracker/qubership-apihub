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

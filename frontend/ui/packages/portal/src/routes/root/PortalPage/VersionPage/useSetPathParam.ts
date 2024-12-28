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

import type { Params } from 'react-router-dom'
import { generatePath, matchPath, useNavigate, useParams } from 'react-router-dom'
import { useLocation } from 'react-use'
import {
  API_CHANGES_PAGE,
  COMPARE_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  OPERATION_GROUPS_PAGE,
  OPERATIONS_PAGE,
  OVERVIEW_PAGE,
  PACKAGES_PAGE,
  REVISION_HISTORY_PAGE,
  SUMMARY_PAGE,
} from '../../../../routes'

const versionPageRoute = 'portal/packages/:packageId/:versionId'
const routes = [
  // overview
  `${versionPageRoute}/${OVERVIEW_PAGE}/${SUMMARY_PAGE}`,
  `${versionPageRoute}/${OVERVIEW_PAGE}/${PACKAGES_PAGE}`,
  `${versionPageRoute}/${OVERVIEW_PAGE}/${REVISION_HISTORY_PAGE}`,
  `${versionPageRoute}/${OVERVIEW_PAGE}/${OPERATION_GROUPS_PAGE}`,
  // operations
  `${versionPageRoute}/${OPERATIONS_PAGE}/:apiType`,
  `${versionPageRoute}/${OPERATIONS_PAGE}/:apiType/:operationId`,
  // api changes
  `${versionPageRoute}/${API_CHANGES_PAGE}/:apiType`,
  // deprecated
  `${versionPageRoute}/${DEPRECATED_PAGE}/:apiType`,
  // documents
  `${versionPageRoute}/${DOCUMENTS_PAGE}`,
  // compare
  `${versionPageRoute}/${COMPARE_PAGE}/:apiType/:operationId`,
]

function generatePathname(
  pathname: string = '',
  params: Readonly<Params<string>>,
  valueToChange: string,
  keyToChange: string,
): string {
  const pathPattern = routes.find((pattern) => matchPath(pattern, pathname)) ?? ''

  return generatePath(pathPattern, { ...params, [keyToChange]: valueToChange })
}

export function useSetPathParam(): (valueToChange: string, keyToChange?: string) => void {
  const { pathname } = useLocation()
  const params = useParams()
  const navigate = useNavigate()

  return (valueToChange: string, keyToChange: string = 'apiType') => {
    navigate({
      pathname: `/${(generatePathname(pathname, params, valueToChange, keyToChange))}/`,
      search: location.search,
    })
  }
}

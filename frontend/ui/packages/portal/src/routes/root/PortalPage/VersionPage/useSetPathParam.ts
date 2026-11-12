import type { Params } from 'react-router-dom'
import { generatePath, matchPath, useNavigate, useParams } from 'react-router-dom'
import { useLocation } from 'react-use'
import {
  API_CHANGES_PAGE,
  COMPARE_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  OPERATION_GROUPS_PAGE,
  CONTRACTS_PAGE,
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
  `${versionPageRoute}/${CONTRACTS_PAGE}/:apiType`,
  `${versionPageRoute}/${CONTRACTS_PAGE}/:apiType/:operationId`,
  // api changes
  `${versionPageRoute}/${API_CHANGES_PAGE}/:apiType`,
  // deprecated
  `${versionPageRoute}/${DEPRECATED_PAGE}/:apiType`,
  // documents
  `${versionPageRoute}/${DOCUMENTS_PAGE}`,
  // compare
  `${versionPageRoute}/${COMPARE_PAGE}/:apiType/:operationId`,
]

export function generatePathname(
  pathname: string = '',
  params: Readonly<Params<string>>,
  valueToChange: string,
  keyToChange: string,
): string {
  const pathPattern = routes.find((pattern) => matchPath(pattern, pathname)) ?? ''

  const decodedParams: Params<string> = { ...params, [keyToChange]: valueToChange }
  const encodedParams = Object.fromEntries(
    Object.entries(decodedParams).map(([key, value]) => [key, value && encodeURIComponent(value)]),
  )
  return generatePath(pathPattern, encodedParams)
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

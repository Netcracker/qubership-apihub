import { useMatch } from 'react-router-dom'
import { FAVORITE_PAGE, PRIVATE_PAGE, SHARED_PAGE, WORKSPACES_PAGE } from '../../../routes'

export function useIsFavoritesMainPage(): boolean {
  return !!useMatch(`/${PORTAL}/${FAVORITE_PAGE}`)
}

export function useIsSharedMainPage(): boolean {
  return !!useMatch(`/${PORTAL}/${SHARED_PAGE}`)
}

export function useIsPrivateMainPage(): boolean {
  return !!useMatch(`/${PORTAL}/${PRIVATE_PAGE}`)
}

export function useIsWorkspacesPage(): boolean {
  return !!useMatch(`/${PORTAL}/${WORKSPACES_PAGE}`)
}

const PORTAL = 'portal'

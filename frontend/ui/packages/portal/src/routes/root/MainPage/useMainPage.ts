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

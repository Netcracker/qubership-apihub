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

import { useParams } from 'react-router-dom'

// We use '*' as path param for VersionPage routing, it helps to understand which subpage need to be render
export function useActiveTabs(): string[] {
  const { '*': pathParams = '' } = useParams()
  const [menuItem, sidebarItem] = pathParams.split('/')

  return [
    menuItem,
    sidebarItem,
  ]
}

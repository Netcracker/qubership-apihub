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

import { useQuery } from '@tanstack/react-query'
import type { AppTypeApiHub, VersionInfo, VersionInfoDto } from '../../utils/version-info'
import { portal } from '../../utils/version-info'
import { getVersionInfoOptions } from '../../utils/version-info'

// `frontendVersion` used to come from `import * as packageJson from
// '../../../../portal/package.json'`, and both halves of that were wrong.
//
// Wrong value: this hook serves BOTH apps. `BasePage.tsx` in agents calls
// `useVersionInfo(agent)` and a shared component calls it with no argument, so the fallback
// reported Portal's version inside Agents. A placeholder that admits it does not know beats
// a number that names the wrong product.
//
// Wrong shape: it made `ui-shared` depend on `ui-portal` while `ui-portal` already depends
// on `ui-shared`. In the monorepo that is a cycle in the Nx project graph: a change to Portal
// alone marks ui-shared and ui-agents affected, and the day ui-shared gains a `build` script,
// `dependsOn: ["^build"]` becomes a circular task dependency and Nx refuses to run.
//
// This file is also what shared's own .eslintrc.json exists to prevent — it bans
// `@netcracker/qubership-apihub-ui-portal` and `…/*` by name. A relative path matched neither
// pattern, so the rule was aimed at the spelling rather than at the boundary. It now covers
// the traversal form too.
//
// The real values come from the version.json that ui/vite-create-version-json.ts generates per
// app, fetched by the query below. The fallback is what the hook returns before that resolves,
// or when the fetch fails. Each app passes its own package.json version as the fallback:
// BasePage shows the "APIHUB UI is out of date" dialog when its version differs from
// frontendVersion, so a fallback that differs from the app's version shows that dialog on
// every page load until version.json arrives.
const UNKNOWN_VERSION = '0.0.0-unknown'

export function useVersionInfo(
  appType: AppTypeApiHub = portal,
  fallbackFrontendVersion: string = UNKNOWN_VERSION,
): VersionInfo {
  const { data } = useQuery<VersionInfoDto, Error, VersionInfo>(
    getVersionInfoOptions(appType),
  )

  return data ?? { frontendVersion: fallbackFrontendVersion, apiProcessorVersion: UNKNOWN_VERSION }
}

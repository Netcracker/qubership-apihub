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

import type { FC } from 'react'
import { memo } from 'react'

import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

import { GuidesCard } from './GuidesCard'
import { GuidesSidebar } from './GuidesSidebar'

/** Package-level guides: article metadata from the docs backend, body from the APIHUB package version document. */
export const VersionGuidesSubPage: FC = memo(() => {
  return (
    <PageLayout
      navigation={<GuidesSidebar/>}
      body={<GuidesCard/>}
      nestedPage
      data-testid="GuidesTab"
    />
  )
})

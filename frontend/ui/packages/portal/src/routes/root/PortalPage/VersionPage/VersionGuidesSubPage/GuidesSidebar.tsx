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
import { memo, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'

import { GuidesNavigation } from '@portal/components/GuidesNavigation/GuidesNavigation'
import { flattenNavigation } from '@portal/utils/guides-navigation'
import { usePackageGuidesNavigation } from './usePackageGuidesNavigation'

export const GuidesSidebar: FC = memo(() => {
  const { guideSlug } = useParams()
  const navigate = useNavigate()
  const { sections, isLoading } = usePackageGuidesNavigation()
  const firstGuide = useMemo(() => flattenNavigation(sections)[0]?.item, [sections])

  // Open the first guide when the tab is opened without a selection
  useEffect(() => {
    if (!guideSlug && firstGuide?.path) {
      navigate(firstGuide.path, { replace: true })
    }
  }, [firstGuide, guideSlug, navigate])

  return (
    <SidebarPanel
      header={<PageTitle title="Guides"/>}
      body={
        <GuidesNavigation
          sections={sections}
          currentSlug={guideSlug}
          isLoading={isLoading}
          width="100%"
        />
      }
      withDivider
    />
  )
})

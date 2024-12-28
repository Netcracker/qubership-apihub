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

import type { FC, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useEffectOnce } from 'react-use'
import { Box, Link, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import type { Activity } from '../../entities/activities'
import type { ActivityMessage } from '../../utils/activities'
import { EMPTY_ACTIVITY_MESSAGE, getActivityMessageServiceInstance, LINK_PLACEHOLDER } from '../../utils/activities'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { PrincipalView } from '@netcracker/qubership-apihub-ui-shared/components/PrincipalView'

type ActivitiesListItemProps = {
  activity: Activity
}

// First Order Component //
export const ActivityListItem: FC<ActivitiesListItemProps> = ({ activity }) => {
  const [content, setContent] = useState<ActivityMessage>(EMPTY_ACTIVITY_MESSAGE)

  useEffectOnce(() => {
    const messageService = getActivityMessageServiceInstance(activity)
    setContent(messageService.mapActivityToMessage())
  })

  const renderTextAsHTML = useCallback((text: string): ReactNode => {
    return <div style={{ display: 'inline' }} dangerouslySetInnerHTML={{ __html: text }}/>
  }, [])

  const activityMessageElement = useMemo(() => {
    const { messageTemplate, links } = content

    if (!links) {
      return renderTextAsHTML(messageTemplate)
    }

    const templateAsArray = messageTemplate.split(LINK_PLACEHOLDER)

    let element = <></>
    for (let i = 0, linksHandled = 0; i < templateAsArray.length; i++) {
      const templateItem = templateAsArray[i]
      let linkElement = null
      if (i > 0) {
        const link = links[linksHandled]
        if (!link) {
          throw new Error('Links array is incompatible with message template')
        }
        linkElement = (
          <Link component={NavLink} to={{ pathname: link.path }} style={{}}>
            {link.displayName}
          </Link>
        )
        linksHandled++
      }
      element = (
        <>
          {element}
          {linkElement}
          {renderTextAsHTML(templateItem)}
        </>
      )
    }
    return element
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <Box mb={2} data-testid="ActivityListItem">
      <Box display="flex" mb={1} alignItems="center">
        <Box mr={1} minWidth={85} data-testid="ActivityDate">
          <FormattedDate
            value={activity.date}
            color="#8992A1"
          />
        </Box>
        <PrincipalView value={activity.principal}/>
      </Box>
      <Box overflow="auto" data-testid="ActivityMessage">
        <Typography variant="body2">
          {activityMessageElement}
        </Typography>
      </Box>
    </Box>
  )
}

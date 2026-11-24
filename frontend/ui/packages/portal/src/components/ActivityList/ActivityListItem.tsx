import type { FC } from 'react'
import { useMemo, useState } from 'react'
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

  const activityMessageElement = useMemo(() => {
    const { messageTemplate, links } = content
    if (!links) {
      return messageTemplate
    }

    const templateAsArray = messageTemplate.split(LINK_PLACEHOLDER)

    let element = <></>
    for (let i = 0, linksHandled = 0; i < templateAsArray.length; i++) {
      const templateItem = templateAsArray[i]
      let linkElement = null
      if (i > 0) {
        const link = links?.[linksHandled]
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
          {templateItem}
        </>
      )
    }
    return element
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

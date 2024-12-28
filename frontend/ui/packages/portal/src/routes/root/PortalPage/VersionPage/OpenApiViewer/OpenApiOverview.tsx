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
import { memo, useMemo } from 'react'
import { Box, Link } from '@mui/material'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'
import type { Document } from '@apihub/entities/documents'

export type OpenApiOverviewProps = Pick<Document, 'labels' | 'description' | 'info' | 'externalDocs'>

export const OpenApiOverview: FC<OpenApiOverviewProps> = memo<OpenApiOverviewProps>((
  { labels, description, info, externalDocs },
) => {

  const contactLinks = useMemo(() => {
    if (!info?.contact) {
      return null
    }

    const { contact } = info

    let links: ContactLink[] = []
    if (contact.name && contact.url && contact.email) {
      links = [{ title: contact.name, url: contact.url }, { title: 'Email', url: contact.email, mail: true }]
    } else if (contact.name && contact.email) {
      links = [{ title: contact.name, url: contact.email, mail: true }]
    } else if (contact.url && contact.email) {
      links = [{ title: 'URL', url: contact.url }, { title: 'Email', url: contact.email, mail: true }]
    } else if (contact.url) {
      links = [{ title: 'URL', url: contact.url }]
    } else if (contact.email) {
      links = [{ title: 'Email', url: contact.email, mail: true }]
    }

    return <>
      {links.map(({ title, url, mail }, index) =>
        <>
          {index !== 0 && <> | </>}
          <span>{title}: </span>
          <Link href={mail ? `mailto:${url}` : url}>{url}</Link>
        </>,
      )}
    </>
  }, [info])

  const license = useMemo(() => {
    if (!info?.license?.name) {
      return null
    }

    const { name, url } = info.license

    return <>
      <span>License: </span>
      {url ? <Link href={url}>{name}</Link> : <span>{name}</span>}
    </>
  }, [info])

  return (
    <Box sx={{ height: '100%', width: '100%', overflow: 'scroll' }} data-testid="OverviewContent">
      <Placeholder
        invisible={!!info || !!externalDocs || !!description || !!labels}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No content"
      >
        {labels && labels.length !== 0 && (
          <Box sx={blockStyle} data-testid="DocumentLabels">
            {labels.map(label => <CustomChip key={crypto.randomUUID()} value={label} sx={{ mr: 1 }}/>)}
          </Box>
        )}
        <Box sx={blockStyle}>
          {contactLinks}
          {contactLinks && license && (<> | </>)}
          {license}
        </Box>
        {description && (
          <Box sx={blockStyle}>
            <MarkdownViewer value={description}/>
          </Box>
        )}
        {info?.termsOfService && (
          <Box sx={blockStyle}>
            <Link href={info.termsOfService}>Term of service</Link>
          </Box>
        )}
        {externalDocs?.url && (
          <Box sx={blockStyle}>
            <Link href={externalDocs?.url}>{externalDocs?.description ?? externalDocs.url}</Link>
          </Box>
        )}
      </Placeholder>
    </Box>
  )
})

const blockStyle = { mt: 2, mb: 2 }

type ContactLink = {
  title: string
  url?: string
  mail?: boolean
}

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

import type { FC, HTMLAttributes } from 'react'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  CardHeader,
  TextField,
  Typography,
} from '@mui/material'
import { Header } from './internal/Header'
import { useSpecsRaw } from '../../useSpecRaw'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { GRAPHQL_SCHEMA_SPEC_TYPE, isGraphQlSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { useMergedGraphQlSpec } from './useMergedGraphQlSpec'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import { GRAPHQL_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { Service } from '@apihub/entities/services'
import { CommonSpecificationPopup } from './CommonSpecificationPopup'
import { sortBy } from 'lodash-es'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { KeyIcon } from '@netcracker/qubership-apihub-ui-shared/icons/KeyIcon'
import { useIdentityProviderUrl, useSetIdentityProviderUrl } from '../../IdpUrlContextProvider'
import type { IdpAuthTokenFormData } from '@netcracker/qubership-apihub-ui-shared/components/IdpAuthTokenForm'
import { IdpAuthTokenForm } from '@netcracker/qubership-apihub-ui-shared/components/IdpAuthTokenForm'
import { useIdpAuthToken } from './useIdpAuthToken'
import { useLocalIdpAuthToken } from '../../useLocalIdpAuthToken'
import { useEffectOnce } from 'react-use'

export type GraphQlSpecificationPopupProps = {
  clickedSpec: Spec
  service: Service
  open: boolean
  setOpen: (value: boolean) => void
  agentId?: string
  namespaceKey?: string
}

type SchemaOption = Pick<Spec, 'key' | 'name'>
export const GraphQlSpecificationPopup: FC<GraphQlSpecificationPopupProps> = memo<GraphQlSpecificationPopupProps>(({
  clickedSpec,
  service,
  open,
  setOpen,
  agentId,
  namespaceKey,
}) => {
  const [endpoint, setEndpoint] = useState(DEFAULT_GRAPHQL_ENDPOINT)
  const [currentSchemaOption, setCurrentSchemaOption] = useState<SchemaOption>(COMBINED_SCHEMA_OPTION)
  const [schemaOptions, setSchemaOptions] = useState<SchemaOption[]>([COMBINED_SCHEMA_OPTION])

  const graphQlSpecs = useMemo(() => (
    sortBy(service.specs.filter(({ type }) => isGraphQlSpecType(type)), 'name')
  ), [service?.specs])
  const hasManySpecs = graphQlSpecs.length > 1
  const graphQlSpecKeys = useMemo(() => (graphQlSpecs?.map(spec => spec.key) || []), [graphQlSpecs])
  const [specsRawMap, isSpecsLoading] = useSpecsRaw({ serviceKey: clickedSpec.serviceKey!, specKeys: graphQlSpecKeys })
  const specsRaw = useMemo(() => [...specsRawMap.values()], [specsRawMap])
  const mergedSpecRaw = useMergedGraphQlSpec({ specsRaw: specsRaw, enabled: hasManySpecs })

  const [expand, setExpand] = useState<boolean>(false)

  const proxyServer = useMemo(() => ({
    url: getAgentProxyServerUrl(clickedSpec?.serviceKey, agentId, namespaceKey, endpoint),
  }), [agentId, clickedSpec?.serviceKey, endpoint, namespaceKey])
  const spec: Spec = useMemo(() => (
    {
      type: GRAPHQL_SCHEMA_SPEC_TYPE,
      proxyServerUrl: proxyServer.url,
      serviceKey: service.key,
      extension: GRAPHQL_FILE_EXTENSION,
      ...(mergedSpecRaw && (currentSchemaOption?.key === COMBINED_SCHEMA_OPTION_NAME) ? COMBINED_SCHEMA_OPTION : currentSchemaOption),
    }
  ), [currentSchemaOption, mergedSpecRaw, proxyServer.url, service.key])

  const value = useMemo(() => (
    spec.key === COMBINED_SCHEMA_OPTION_NAME && mergedSpecRaw ? mergedSpecRaw : specsRawMap.get(spec.key) || ''
  ), [mergedSpecRaw, spec.key, specsRawMap])

  const idpUrl = useIdentityProviderUrl()
  const setIdpUrl = useSetIdentityProviderUrl()

  const [localAuthToken, setLocalAuthToken] = useLocalIdpAuthToken()

  const [authToken, getIdpAuthToken, isIdpAuthTokenLoading] = useIdpAuthToken()
  const onGetIdpAuthToken = useCallback((data: IdpAuthTokenFormData): void => {
    getIdpAuthToken({
      agentId: agentId!,
      namespaceId: namespaceKey!,
      ...data,
    })
  }, [agentId, getIdpAuthToken, namespaceKey])

  useEffectOnce(() => {
    setExpand(!localAuthToken)
  })

  useEffect(() => {
    if (authToken) {
      setLocalAuthToken(authToken)
    }
  }, [authToken, setLocalAuthToken])

  useEffect(() => {
    setCurrentSchemaOption(hasManySpecs && mergedSpecRaw ? COMBINED_SCHEMA_OPTION : clickedSpec)
    setSchemaOptions(hasManySpecs ? [COMBINED_SCHEMA_OPTION, ...graphQlSpecs] : graphQlSpecs)
  }, [mergedSpecRaw, clickedSpec, hasManySpecs, graphQlSpecs])

  const headerComponent = (
    <CardHeader
      sx={{ p: 0 }}
      title="GraphQL Playground"
      subheader={(
        <Box>
          <Header agentId={agentId} namespaceKey={namespaceKey} specKey={clickedSpec?.serviceKey}>
            <Box display="flex" gap="2px" alignItems="center" justifyContent="center" flexGrow="">
              <Typography variant="caption" fontWeight="bold" minWidth="max-content">Endpoint*:</Typography>
              <TextField
                value={endpoint}
                onChange={event => setEndpoint(event.target.value)}
                size="small"
                sx={{
                  margin: 0,
                  input: {
                    textAlign: 'center',
                    padding: 0,
                    margin: 0,
                    minWidth: '180px',
                  },
                }}
              />
            </Box>
            <Box width={250} display="flex" gap="2px" alignItems="center" justifyContent="center" flexGrow="">
              <Typography variant="caption" fontWeight="bold" minWidth="max-content">Schema:</Typography>
              <Autocomplete<SchemaOption, false, true>
                disabled={isSpecsLoading}
                disableClearable
                value={currentSchemaOption}
                fullWidth
                options={schemaOptions}
                renderOption={(props, spec) => <SpecOptionItem
                  props={props}
                  key={spec.key}
                  spec={spec}
                  mergedSchemaAvailable={!!mergedSpecRaw}
                />}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                getOptionLabel={(option) => option?.name ?? ''}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' }, m: 0 }}
                  />
                )}
                onChange={(_, value) => setCurrentSchemaOption(value)}
              />
            </Box>
          </Header>

          <Box display="flex">
            <Accordion expanded={expand}>
              <AccordionSummary
                sx={{ pl: 0, width: '130px' }}
                expandIcon={<ExpandMoreIcon/>}
                onClick={() => setExpand(!expand)}
              >
                <KeyIcon color="#626D82"/>
                <Typography width="100%" noWrap variant="button">Authenticate</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <IdpAuthTokenForm
                  onGetUdpAuthToken={onGetIdpAuthToken}
                  isLoading={isIdpAuthTokenLoading}
                  defaultIdpUrl={idpUrl}
                  onIdpChange={setIdpUrl}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      )}
    />
  )

  return <CommonSpecificationPopup
    spec={spec}
    proxyServer={proxyServer}
    value={value}
    header={localAuthToken}
    isLoading={isSpecsLoading}
    headerComponent={headerComponent}
    disableSpecViewToggler={true}
    open={open}
    setOpen={setOpen}
  />
})

export type SpecOptionItemProps = {
  props: HTMLAttributes<HTMLLIElement>
  spec: SchemaOption
  mergedSchemaAvailable: boolean
}

export const SpecOptionItem: FC<SpecOptionItemProps> = memo<SpecOptionItemProps>(({
  props,
  spec,
  mergedSchemaAvailable,
}) => {
  const isDisabled = useMemo(() => (
    spec.key === COMBINED_SCHEMA_OPTION_NAME && !mergedSchemaAvailable
  ), [mergedSchemaAvailable, spec.key])

  return (
    <OptionItem
      props={props}
      key={spec.key}
      title={spec.name}
      disabled={isDisabled}
      tooltipProps={{
        title: isDisabled ? 'Combined schema is not available due to problems with merging GraphQL schemas' : null,
        PopperProps: {
          sx: { '.MuiTooltip-tooltip': { maxWidth: 'unset' } },
        },
      }}
    />
  )
})

function getAgentProxyServerUrl(serviceKey?: string, agentId?: string, namespace?: string, endpoint = DEFAULT_GRAPHQL_ENDPOINT): string {
  if (!agentId || !namespace) {
    return ''
  }

  return `${APIHUB_NC_BASE_PATH}/agents/${agentId}/namespaces/${namespace}/services/${serviceKey}/proxy${endpoint}`
}

const DEFAULT_GRAPHQL_ENDPOINT = '/api/graphql-server/graphql'
const COMBINED_SCHEMA_OPTION_NAME = '<Combined Schema>'
const COMBINED_SCHEMA_OPTION = {
  key: COMBINED_SCHEMA_OPTION_NAME,
  name: COMBINED_SCHEMA_OPTION_NAME,
} as const

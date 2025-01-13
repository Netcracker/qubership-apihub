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

export const OGR_TMPL_EXIST_MSG = 'The group has OpenAPI export template'
export const OGR_TMPL_INFO_MSG = 'The OpenAPI specification template is the template that will be used when downloading the combined specification. The following information will be taken from the template, if specified, and applied to the combined specification: info, servers, externalDocs, security and securitySchemes. The template must be a valid JSON or YAML file and have an OpenAPI 3.0 structure.'
export const OGR_MORE_THEN_200_OPERATIONS_MSG = 'You cannot add more than 200 operations to the group.'
export const OGR_PREFIX_ERROR_MSG = 'The value must begin and end with a "/" character and contain the {group} keyword, for example /api/{group}/.'
export const OGR_PREFIX_EDITING_MSG = 'Operations cannot be changed in the REST Path Prefix group'
export const OGR_PREFIX_DELETION_MSG = 'Deletion is not available for the REST Path Prefix group'

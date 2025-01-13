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

export const REV_METADATA = {
  branchName: 'meta-branch',
  repositoryUrl: 'https://git.metagit.com/repository.git',
}

export const PORTAL_TEST_ZIP_PATH = 'resources/portal/zip/'

export const RV_PATTERN_DEF = '^[0-9]{4}[.]{1}[1-4]{1}$'
export const RV_PATTERN_NEW = '^[0-9]{2}[.]{1}[A-z]{4}$'

export const DEF_PREFIX_GROUP = '/api/{group}/'
export const API_PREFIX_GROUP = '/{group}/'
export const INVALID_PREFIX_GROUP = '{group}'

export const PACKAGE_VISIBILITY_PUBLIC = 'Public (default role - Viewer)'
export const PACKAGE_VISIBILITY_PRIVATE = 'Private'

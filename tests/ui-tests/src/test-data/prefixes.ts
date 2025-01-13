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

/**
 * The prefix is used for identifying test entities, extract test IDs and their later removal from the database.
 *
 * Must contain only **letters**, **numbers** and end with '**-**'.
 */
export const TEST_PREFIX = '1UI-'
/**
 * It must be **'QS'** because, to remove test entities from the database, the alias must match the mask **QS%-testId%**.
 */
export const ALIAS_PREFIX = 'QS'
export const WORKSPACE_PREFIX = 'Workspace'
export const GROUP_PREFIX = 'Group'
export const PACKAGE_PREFIX = 'Package'
export const DASHBOARD_PREFIX = 'Dashboard'

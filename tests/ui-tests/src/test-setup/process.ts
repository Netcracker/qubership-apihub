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
 * **undefined** (*default*) - create only Non-Reusable test data
 *
 * **all** - create both reusable and Non-Reusable test data
 *
 * **skip** - skip test data creation
 */
export const CREATE_TD = process.env.CREATE_TD as 'all' | 'skip' | undefined

/**
 * **undefined** (*default*) - clear only Non-Reusable test data
 *
 * **all** - clear both reusable and Non-Reusable test data
 *
 * **skip** - skip test data clearing
 */
export const CLEAR_TD = process.env.CLEAR_TD as 'all' | 'skip' | undefined

/**
 * **undefined** (*default*) - use local authentication
 *
 * **skip** - skip authentication (storage state must be already saved)
 */
export const AUTH = process.env.AUTH as 'skip' | undefined

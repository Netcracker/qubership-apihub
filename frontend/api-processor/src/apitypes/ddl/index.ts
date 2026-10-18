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

// Light DDL surface: model-only (parser-free). The parser-bearing pieces
// (`parseDdlFile`, `ddlBuilder`) live in ./ddl.builder and are exposed only via
// the package's `/processor` entry, so importing the api-processor root never
// pulls the ddlapi parser / libpg-query WASM.

export * from './ddl.changes'
export * from './ddl.consts'
export * from './ddl.document'
export * from './ddl.entities'
export * from './ddl.types'
export * from './ddl.utils'
export * from './ddl.validation'

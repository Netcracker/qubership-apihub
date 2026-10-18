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

// Heavy entry: the spec-processing engine. This is a superset of the light root
// plus PackageVersionBuilder, the build strategy, the compare/build engine and the
// DDL builder. It transitively imports the ddlapi parser (pgsql-parser / libpg-query
// WASM), so import it only where actual processing happens (publish/changelog/export
// workers, build-task-consumer) — never on the UI main thread.

export * from './index'
export * from './builder'
export * from './builder-strategy'
export * from './components'
export * from './apitypes/ddl/ddl.builder'

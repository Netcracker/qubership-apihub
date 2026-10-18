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

import { existsSync, readFileSync, writeFileSync } from 'fs'

const FILE_TO_PATCH = 'node_modules/@storybook/core-server/dist/index.js'
if (existsSync(FILE_TO_PATCH)) {
  const buffer = readFileSync(FILE_TO_PATCH)
  const content = buffer.toString()
  const newContent = content.replace('import_node_logger5.logger.info(`=> Output directory: ${options.outputDir}`)', 'import_node_logger5.logger.info(`=> Output directory: ${options.outputDir}`),process.exit(0)')
  writeFileSync(FILE_TO_PATCH, newContent)
}

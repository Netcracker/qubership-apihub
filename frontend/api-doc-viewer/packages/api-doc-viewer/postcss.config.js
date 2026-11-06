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

import autoprefixer from 'autoprefixer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import cssIsolation from './postcss/css-isolation.cjs'

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))

export default {
    plugins: [
        tailwindcss(),
        autoprefixer(),
        /* Prefixes classes, scopes global rules to the viewer root, renames fonts and keyframes.
           Design: docs/design/shared/features/css-isolation.md */
        cssIsolation({
            include: [path.join(packageDirectory, 'src')],
            fontFamilies: ['Inter', 'Inter Medium', 'Inter Semi Bold', 'Inter Variable', 'Fire Code'],
        }),
    ],
}

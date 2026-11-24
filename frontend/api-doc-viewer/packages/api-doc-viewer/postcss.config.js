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

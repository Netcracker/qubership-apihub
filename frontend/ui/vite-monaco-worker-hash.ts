import type { Plugin } from 'vite'
import * as path from 'path'
import * as fs from 'fs'
import { createHash } from 'node:crypto'

const ENCODING: BufferEncoding = 'utf-8'

function generateFileHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 10)
}

export interface IMonacoHashOpts {
  monacoDir: string
  htmlPath: string
}

/**
 * Vite plugin to append a content-based hash to Monaco Editor worker filenames.
 *
 * `vite-plugin-monaco-editor` generates worker files with static names,
 * which causes problems with HTTP caching — updated worker code might be ignored
 * by the browser due to long-term cache.
 *
 * This plugin runs **after** `vite-plugin-monaco-editor` and rewrites the
 * worker file names to include a unique hash, ensuring proper cache invalidation
 * when the content changes.
 *
 * Intended for local use in projects that integrate Monaco Editor with Vite.
 */
export default function monacoWorkerHashPlugin(options: IMonacoHashOpts): Plugin {
  const { monacoDir, htmlPath } = options

  return {
    name: 'vite-plugin-monaco-hash',
    writeBundle() {
      const fileNameMap: { [key: string]: string } = {}
      const dirPath = path.resolve(process.cwd(), monacoDir)
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isFile()) {
          const data: Buffer = fs.readFileSync(fullPath)
          const hash = generateFileHash(data)

          const ext = path.extname(entry.name)
          const baseName = path.basename(entry.name, ext)
          const newFileName = `${baseName}-${hash}${ext}`
          const newPath = path.join(dirPath, newFileName)

          fs.renameSync(fullPath, newPath)

          fileNameMap[entry.name] = newFileName
        }
      }

      const htmlFullPath = path.resolve(process.cwd(), htmlPath)
      if (fs.existsSync(htmlFullPath)) {
        let htmlContent = fs.readFileSync(htmlFullPath, ENCODING)

        for (const [oldName, newName] of Object.entries(fileNameMap)) {
          htmlContent = htmlContent.replace(oldName, newName)
        }
        fs.writeFileSync(htmlFullPath, htmlContent, ENCODING)
      }
    },
  }
}

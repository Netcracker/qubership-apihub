import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

export default function removeMswFromDistPlugin(): Plugin {
  return {
    name: 'remove-msw-from-dist',
    apply: 'build',
    closeBundle: function() {
      const swDistPath = path.resolve(process.cwd(), 'dist', 'mockServiceWorker.js')
      if (fs.existsSync(swDistPath)) {
        fs.unlinkSync(swDistPath)
      }
    },
  }
}

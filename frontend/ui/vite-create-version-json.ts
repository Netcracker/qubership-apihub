import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

export default function createVersionJsonFilePlugin(): Plugin {

  return {
    name: 'create-version-json-file',
    async closeBundle() {
      const lernaPath = path.resolve(__dirname, 'lerna.json')
      const packagePath = path.resolve(__dirname, 'package.json')
      const outputPathPortal = path.resolve(__dirname, 'packages/portal/dist/version.json')
      const outputPathAgent = path.resolve(__dirname, 'packages/agents/dist/version.json')

      let lernaVersion = null
      let libraryVersion = null

      if (fs.existsSync(lernaPath)) {
        const lerna = JSON.parse(fs.readFileSync(lernaPath, 'utf-8'))
        lernaVersion = lerna.version
      }

      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
        libraryVersion =
          pkg.dependencies?.['@netcracker/qubership-apihub-api-processor']
      }

      if (!libraryVersion || !lernaVersion) {
        this.error('Version not found: @netcracker/qubership-apihub-api-processor or lerna.json')
      }

      const versionData = {
        frontendVersion: lernaVersion,
        apiProcessorVersion: libraryVersion,
      }

      if (!fs.existsSync(path.dirname(outputPathPortal))) {
        fs.mkdirSync(path.dirname(outputPathPortal), { recursive: true })
      }

      if (!fs.existsSync(path.dirname(outputPathAgent))) {
        fs.mkdirSync(path.dirname(outputPathAgent), { recursive: true })
      }

      fs.writeFileSync(outputPathPortal, JSON.stringify(versionData, null, 2))
      fs.writeFileSync(outputPathAgent, JSON.stringify(versionData, null, 2))
    },
  }
}

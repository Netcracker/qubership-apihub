import { existsSync, readFileSync, writeFileSync } from 'fs'

const FILE_TO_PATCH = 'node_modules/@storybook/core-server/dist/index.js'
if (existsSync(FILE_TO_PATCH)) {
  const buffer = readFileSync(FILE_TO_PATCH)
  const content = buffer.toString()
  const newContent = content.replace('import_node_logger5.logger.info(`=> Output directory: ${options.outputDir}`)', 'import_node_logger5.logger.info(`=> Output directory: ${options.outputDir}`),process.exit(0)')
  writeFileSync(FILE_TO_PATCH, newContent)
}

const path = require('path')
const { prepareJestConfig } = require('@netcracker/qubership-apihub-jest-chrome-in-docker-environment')

module.exports = prepareJestConfig(
  path.resolve(__dirname, './common-it-test.jest.config.js'),
  path.resolve(__dirname, './common-puppeteer.config.js'),
  {
    dockerImage: 'ghcr.io/netcracker/qubership-apihub-nodejs-dev-image:1.7.3',
  },
)

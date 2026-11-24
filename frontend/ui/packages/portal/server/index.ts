// eslint-disable-next-line filenames/no-index
import http from 'http'
import { createApp } from './createApp'

const app = createApp()
const port = process.env.NODEJS_PORT || 3003
const server = http.createServer(app)

server.listen(port, () => console.log(`Mock server is listening on port ${port}`))

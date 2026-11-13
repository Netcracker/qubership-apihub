// eslint-disable-next-line filenames/no-index
import 'unfonts.css'
import { App } from './App'
import { createRoot } from 'react-dom/client'
import { enableMocking } from './mocks/enable-mocking'

await enableMocking()

const container = document.createElement('div')
document.body.appendChild(container)
createRoot(container).render(<App/>)

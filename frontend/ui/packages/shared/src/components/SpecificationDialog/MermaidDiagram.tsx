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

import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

// mermaid is a singleton — initialize it only once across all instances.
let mermaidInitialized = false

type MermaidDiagramProps = {
  value: string
}

const MermaidDiagram: FC<MermaidDiagramProps> = memo(({ value }) => {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSvg(null)
    setError(null)

    let isMounted = true
    const effectId = `mermaid-${uuidv4()}`

    async function renderChart(): Promise<void> {
      const { default: mermaid } = await import('mermaid')

      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
        })
        mermaidInitialized = true
      }
      const { svg: renderedSvg } = await mermaid.render(effectId, value)

      if (isMounted) {
        setSvg(renderedSvg)
        setError(null)
      }
    }

    renderChart()
      .catch((err: unknown) => {
        if (isMounted) {
          setError(String(err))
        }
      })
      .finally(() => {
        // Clean up the temporary element mermaid appends to document.body.
        document.getElementById(effectId)?.remove()
      })

    return () => {
      isMounted = false
      document.getElementById(effectId)?.remove()
    }
  }, [value])

  if (error !== null) {
    return <pre><code>{value}</code></pre>
  }

  // dangerouslySetInnerHTML tells React this content is managed explicitly —
  // it will not overwrite the SVG during reconciliation.
  return <div dangerouslySetInnerHTML={svg !== null ? { __html: svg } : undefined} />
})

MermaidDiagram.displayName = 'MermaidDiagram'

export { MermaidDiagram }

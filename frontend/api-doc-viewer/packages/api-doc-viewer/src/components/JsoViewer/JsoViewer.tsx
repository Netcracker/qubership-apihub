import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { LevelContext } from "@apihub/contexts/LevelContext"
import { JsoTreeBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/jso/tree/builder"
import { FC, memo, useMemo } from "react"
import { DisplayMode, DOCUMENT_LAYOUT_MODE } from "../.."
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import { JsoPropertyNodeViewer } from "./JsoPropertyNodeViewer"

type JsoViewerProps = {
  source: object | null
  displayMode?: DisplayMode
  initialLevel?: number
  supportJsonSchema?: boolean
}

export const JsoViewer: FC<JsoViewerProps> =
  memo<JsoViewerProps>(props => {
    if (props.source === null) {
      return null
    }

    return (
      <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="JSO Viewer" />}>
        <JsoViewerInner {...props} />
      </ErrorBoundary>
    )
  })

const JsoViewerInner: FC<JsoViewerProps> = memo<JsoViewerProps>(props => {
  const { source, displayMode = DEFAULT_DISPLAY_MODE, initialLevel = 0, supportJsonSchema = false } = props

  const builder = useMemo(() => new JsoTreeBuilder(source, supportJsonSchema), [source, supportJsonSchema])
  const tree = useMemo(() => builder.build(), [builder])

  console.debug('[JSO] Source:', source)
  console.debug('[JSO] Tree:', tree)

  const root = tree.root
  if (!root) {
    return null
  }

  const jsoProperties = root.childrenNodes()
  if (jsoProperties.length === 0) {
    return null
  }

  return (
    <DisplayModeContext.Provider value={displayMode}>
      <LayoutModeContext.Provider value={DOCUMENT_LAYOUT_MODE}> {/* Now only 1 layout mode is supported */}
        <LevelContext.Provider value={initialLevel}>
          <div data-testid='jso-viewer'>
            {jsoProperties.map(jsoProperty => (
              <JsoPropertyNodeViewer
                key={jsoProperty.id}
                node={jsoProperty}
                expandable={!jsoProperty.value()?.isPrimitive}
                expanded={true}
                supportJsonSchema={supportJsonSchema}
              />
            ))}
          </div>
        </LevelContext.Provider>
      </LayoutModeContext.Provider>
    </DisplayModeContext.Provider>
  )
})

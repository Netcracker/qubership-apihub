import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { LevelContext } from "@apihub/contexts/LevelContext"
import { JsoTreeBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/jso/tree/builder"
import { createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model/loggers"
import { FC, memo, useMemo } from "react"
import { DisplayMode, DOCUMENT_LAYOUT_MODE, LayoutMode } from "../.."
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { JsoPropertyNodeViewer } from "./JsoPropertyNodeViewer"
import './styles/index.css'

type JsoViewerProps = WithPrecededByProps & {
  source: object | null
  displayMode?: DisplayMode
  layoutMode?: LayoutMode
  initialLevel?: number
  supportJsonSchema?: boolean
  devMode?: boolean
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
  const {
    source,
    displayMode = DEFAULT_DISPLAY_MODE,
    layoutMode = DOCUMENT_LAYOUT_MODE,
    initialLevel = 0,
    supportJsonSchema = false,
    devMode = false,
  } = props

  // indent-specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

  const builder = useMemo(
    () => new JsoTreeBuilder({
      source,
      supportJsonSchema,
      logger,
    }),
    [source, supportJsonSchema, logger],
  )
  const tree = useMemo(() => builder.build(), [builder])

  logger.debug('[JSO] Source:', source)
  logger.debug('[JSO] Tree:', tree)

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
      <LayoutModeContext.Provider value={layoutMode}> {/* Now only 1 layout mode is supported */}
        <LevelContext.Provider value={initialLevel}>
          <div data-testid='jso-viewer'>
            {jsoProperties.map((jsoProperty, index) => (
              <JsoPropertyNodeViewer
                data-precededby={
                  index === 0
                    ? precededBy
                    : PrecededBy.JSO_PROPERTY
                }
                key={jsoProperty.id}
                node={jsoProperty}
                supportJsonSchema={supportJsonSchema}
              />
            ))}
          </div>
        </LevelContext.Provider>
      </LayoutModeContext.Provider>
    </DisplayModeContext.Provider>
  )
})

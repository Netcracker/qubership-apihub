import { NestingIndicatorTitle } from "@apihub/components/common/NestingIndicatorTitle";
import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import { JsoViewer } from "@apihub/components/JsoViewer/JsoViewer";
import { DiffFloatingBadgeWrapper } from "@apihub/components/shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper";
import { SideBySideLayout } from "@apihub/components/shared-components/Layout/SideBySideLayout";
import { LevelIndicator } from "@apihub/components/shared-components/LevelIndicator";
import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext";
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext";
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext";
import { useLevelContext } from "@apihub/contexts/LevelContext";
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide";
import { INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode";
import { DiffMetaKeys, IJsonSchemaBaseType, NodeChange } from "@netcracker/qubership-apihub-api-data-model";
import { isDiffAdd, isDiffRemove, isDiffReplace, type Diff, type DiffType } from "@netcracker/qubership-apihub-api-diff";
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl";
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities";
import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isSpecificationExtensionKey, SpecificationExtensionKey } from "@netcracker/qubership-apihub-next-data-model/model/specification-extension-key";
import { getValueByPath, takeIfDiffsRecord } from "@netcracker/qubership-apihub-next-data-model/utilities";
import { FC, memo, useMemo } from "react";

type ExtensionsSubheaderProps = {
  diff: Diff | undefined
  layoutSide: LayoutSide
}

const ExtensionsSubheader: FC<ExtensionsSubheaderProps> = memo<ExtensionsSubheaderProps>((props) => {
  const { diff, layoutSide } = props

  const level = useLevelContext()

  const { diffStylesClasses, isVisible } = useMemo(() => {
    if (!diff) {
      return {
        diffStylesClasses: [],
        isVisible: true,
      }
    }
    let isVisible = true
    const diffStylesClasses: Set<string> = new Set()
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      if (isDiffAdd(diff)) {
        diffStylesClasses.add(DiffsClassesBuilder.background(HighlightVariant.Gray))
        isVisible = false
      }
      if (isDiffRemove(diff)) {
        diffStylesClasses.add(DiffsClassesBuilder.background(HighlightVariant.Red))
      }
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      if (isDiffAdd(diff)) {
        diffStylesClasses.add(DiffsClassesBuilder.background(HighlightVariant.Green))
      }
      if (isDiffRemove(diff)) {
        diffStylesClasses.add(DiffsClassesBuilder.background(HighlightVariant.Gray))
        isVisible = false
      }
    }
    return {
      diffStylesClasses: Array.from(diffStylesClasses),
      isVisible: isVisible,
    }
  }, [diff, layoutSide])

  return (
    <div className={`flex flex-row h-full ${diffStylesClasses.join(' ')}`}>
      <LevelIndicator level={level + 1} lastInvisible />
      {isVisible && (
        <NestingIndicatorTitle>
          Extensions
        </NestingIndicatorTitle>
      )}
    </div>
  )
})

type ExtensionsProps = {
  extensions: NonNullable<IJsonSchemaBaseType['extensions']>
  $nodeChange?: NodeChange
}

const STUB_DIFF_TYPES: DiffType[] = []

export const Extensions: FC<ExtensionsProps> = (props) => {
  const { extensions, $nodeChange } = props

  const level = useLevelContext()
  const displayMode = useDisplayMode()
  const layoutMode = useLayoutMode()
  const diffMetaKeys = useDiffMetaKeys()
  const inlineDiffsLayout = layoutMode === INLINE_DIFFS_LAYOUT_MODE
  const sideBySideLayout = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  const nodeDiff = useMemo(() => {
    let nodeDiff: Diff | undefined = nodeChangeToDiff($nodeChange)
    if (!nodeDiff) {
      nodeDiff = inferNodeDiff(extensions, diffMetaKeys)
    }
    return nodeDiff
  }, [$nodeChange, extensions, diffMetaKeys])

  const subheaderDiffTypeForBadge = useMemo(() => nodeDiff?.type, [nodeDiff])
  const subheaderDiffTypeCauseForBadge = useMemo(() => {
    if (!nodeDiff) {
      return undefined
    }
    let path: JsonPath = []
    if (isDiffRemove(nodeDiff) || isDiffReplace(nodeDiff)) {
      path = nodeDiff.beforeDeclarationPaths[0] ?? []
    }
    if (isDiffAdd(nodeDiff)) {
      path = nodeDiff.afterDeclarationPaths[0] ?? []
    }
    return path.length > 0 ? `caused by ${path.join('.')} change` : undefined
  }, [nodeDiff])

  const subheader = useMemo(() => {
    const subheaderElement = (
      <div className="flex flex-row">
        <LevelIndicator level={level + 1} lastInvisible />
        <NestingIndicatorTitle>
          Extensions
        </NestingIndicatorTitle>
      </div>
    )
    switch (layoutMode) {
      case INLINE_DIFFS_LAYOUT_MODE:
        return null // TODO: Not supported yet
      case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
        return (
          <DiffFloatingBadgeWrapper
            diffType={subheaderDiffTypeForBadge}
            diffTypeCause={subheaderDiffTypeCauseForBadge}
          >
            <SideBySideLayout
              left={<ExtensionsSubheader diff={nodeDiff} layoutSide={ORIGIN_LAYOUT_SIDE} />}
              right={<ExtensionsSubheader diff={nodeDiff} layoutSide={CHANGED_LAYOUT_SIDE} />}
            />
          </DiffFloatingBadgeWrapper>
        )
      default:
        return subheaderElement
    }
  }, [layoutMode, level, nodeDiff, subheaderDiffTypeCauseForBadge, subheaderDiffTypeForBadge])

  const jsoViewerElement = useMemo(() => {
    if (inlineDiffsLayout) {
      return null // TODO: Not supported yet
    }
    if (sideBySideLayout && diffMetaKeys) {
      const extensionsWithNodeChange = injectNodeChangeToExtensions(extensions, nodeDiff, diffMetaKeys)
      return (
        <JsoDiffsViewer
          mergedSource={extensionsWithNodeChange}
          initialLevel={level + 1}
          displayMode={displayMode}
          diffMetaKeys={diffMetaKeys}
          diffTypes={STUB_DIFF_TYPES}
        />
      )
    }
    return (
      <JsoViewer
        source={extensions}
        initialLevel={level + 1}
      />
    )
  }, [inlineDiffsLayout, sideBySideLayout, diffMetaKeys, extensions, level, nodeDiff, displayMode])

  if (!jsoViewerElement) {
    return null
  }

  return (
    <div className='flex flex-col'>
      {subheader}
      {jsoViewerElement}
    </div>
  )
}

function nodeChangeToDiff(nodeChange?: NodeChange): Diff | undefined {
  if (!nodeChange) {
    return undefined
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { depth, ...diff } = nodeChange
  return diff
}

function injectNodeChangeToExtensions(
  extensions: Record<SpecificationExtensionKey, unknown>,
  nodeChange: Diff | undefined,
  metaKeys: DiffMetaKeys | undefined,
): Record<SpecificationExtensionKey, unknown> {
  if (!nodeChange || !metaKeys) {
    return extensions
  }
  const extensionsKeys = Object.keys(extensions)
  const extensionsDiffsRecord: Record<SpecificationExtensionKey, Diff> = {}
  for (const extensionKey of extensionsKeys) {
    if (!isSpecificationExtensionKey(extensionKey)) {
      continue
    }
    extensionsDiffsRecord[extensionKey] = nodeChange
  }
  return {
    ...extensions,
    [metaKeys.diffsMetaKey]: extensionsDiffsRecord,
  }
}

function inferNodeDiff(
  extensions: Record<SpecificationExtensionKey, unknown>,
  diffMetaKeys: DiffMetaKeys | undefined,
): Diff | undefined {
  if (!diffMetaKeys) {
    return undefined
  }
  const { diffsMetaKey } = diffMetaKeys
  const extensionsKeys = Object.keys(extensions)
  const extensionsDiffsRecord = takeIfDiffsRecord(
    getValueByPath(extensions, [diffsMetaKey]),
  )
  if (!extensionsDiffsRecord) {
    return undefined
  }
  const changedExtensionsKeys = Object.keys(extensionsDiffsRecord)
  if (changedExtensionsKeys.length === 0) {
    return undefined
  }
  if (extensionsKeys.length !== changedExtensionsKeys.length) {
    return undefined
  }
  const diff: Diff | undefined = extensionsDiffsRecord[changedExtensionsKeys[0]]
  for (const changedExtensionKey of changedExtensionsKeys) {
    if (extensionsDiffsRecord[changedExtensionKey]?.action !== diff?.action) {
      return undefined
    }
  }
  return diff
}

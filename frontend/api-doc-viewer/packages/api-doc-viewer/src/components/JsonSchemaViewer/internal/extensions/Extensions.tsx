import { LevelIndicator } from "@apihub/components/AsyncApiOperationViewer/LevelIndicator";
import { JsoViewer } from "@apihub/components/JsoViewer/JsoViewer";
import { DEFAULT_ROW_PADDING_LEFT, SHIFTED_ROW_PADDING_LEFT } from "@apihub/constants/configuration";
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext";
import { useLevelContext } from "@apihub/contexts/LevelContext";
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide";
import { INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode";
import { IJsonSchemaBaseType } from "@netcracker/qubership-apihub-api-data-model";
import { FC } from "react";

type ExtensionsProps = {
  shift?: boolean
  extensions: NonNullable<IJsonSchemaBaseType['extensions']>
}

export const Extensions: FC<ExtensionsProps> = (props) => {
  const { shift = false, extensions } = props

  const layoutMode = useLayoutMode()
  const inlineDiffsLayout = layoutMode === INLINE_DIFFS_LAYOUT_MODE
  const sideBySideDiffsLayout = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  if (inlineDiffsLayout) {
    return null // TODO: Not supported yet
  }

  if (sideBySideDiffsLayout) {
    return (
      <div className='flex flex-row'>
        <ExtensionsContent shift={shift} extensions={extensions} layoutSide={ORIGIN_LAYOUT_SIDE} />
        <ExtensionsContent shift={shift} extensions={extensions} layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  return (
    <div className='flex flex-row'>
      <ExtensionsContent shift={shift} extensions={extensions} layoutSide={CHANGED_LAYOUT_SIDE} />
    </div>
  )
}

type ExtensionsContentProps = {
  shift?: boolean
  extensions: NonNullable<IJsonSchemaBaseType['extensions']>
  layoutSide: LayoutSide
}

const ExtensionsContent: FC<ExtensionsContentProps> = (props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { shift = false, extensions, layoutSide } = props

  const level = useLevelContext()
  const layoutMode = useLayoutMode()
  const sideBySideDiffsLayout = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  const width = sideBySideDiffsLayout ? 'w-1/2' : 'w-full'

  return (
    <div className={`flex flex-row gap-6 ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
      <LevelIndicator level={level} />
      <div className='flex flex-col gap-1'>
        {extensions.map((extension) => (
          <JsoViewer
            key={Object.keys(extension)[0]}
            source={extension}
          />
        ))}
      </div>
    </div>
  )
}

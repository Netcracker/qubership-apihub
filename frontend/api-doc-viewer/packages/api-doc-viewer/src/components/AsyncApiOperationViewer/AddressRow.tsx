import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { FC } from "react"

type AddressRowProps = {
  action: string
  address: string
}

export const AddressRow: FC<AddressRowProps> = (props) => {
  const layoutMode = useLayoutMode()

  if (layoutMode === INLINE_DIFFS_LAYOUT_MODE) {
    return (
      <div style={{ fontSize: 12, marginTop: 4, marginBottom: 4 }}>
        This layout mode ({layoutMode}) is not supported.
      </div>
    )
  }

  return <AddressRowContainer {...props} />
}

const AddressRowContainer: FC<AddressRowProps> = (props) => {
  const layoutMode = useLayoutMode()
  const sideBySideLayout = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  if (sideBySideLayout) {
    return (
      <div className="flex flex-row">
        <AddressRowContent {...props} />
        <AddressRowContent {...props} />
      </div>
    )
  }

  return (
    <div className="flex flex-row">
      <AddressRowContent {...props} />
    </div>
  )
}

const ACTION_COLOR_MAP: Record<string, string> = {
  send: 'bg-sky-400',
  receive: 'bg-green-500',
}

const AddressRowContent: FC<AddressRowProps> = (props) => {
  const { action, address } = props

  const layoutMode = useLayoutMode()
  const isSideBySideDiffsLayoutMode = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

  return (
    <div className={`address-row font-Inter-Medium ${width}`}>
      <div className='flex flex-row items-center w-max py-2 bg-slate-100 rounded-md gap-3' style={{ paddingLeft: 10, paddingRight: 10 }}>
        <div className={`font-bold px-1 py-0 ${ACTION_COLOR_MAP[action]} text-white rounded-md`}>
          {action.toUpperCase()}
        </div>
        <div className='text-slate-500'>{address}</div>
      </div>
    </div>
  )
}

import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { FC } from "react"
import { JsoViewer } from "../JsoViewer/JsoViewer"
import { TitleRow, TitleVariant } from "./TitleRow"

type SpecificationExtensionsProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
}

// TODO: Make it row-like component
export const ExtensionsNodeViewer: FC<SpecificationExtensionsProps> = (props) => {
  const { node } = props

  const value = node.value()
  const extensions = value?.rawValues ?? {}

  return <>
    <TitleRow
      value='Extensions'
      expandable={false}
      variant={TitleVariant.h3}
    />
    <JsoViewer
      source={extensions}
      initialLevel={1}
    />
  </>
}
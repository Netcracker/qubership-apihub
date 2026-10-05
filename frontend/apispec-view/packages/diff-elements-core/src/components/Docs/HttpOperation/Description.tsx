import { DiffBlock } from "@netcracker/qubership-apihub-apispec-view-diff-block";
import * as React from "react";
import { useDescriptionWithMeta } from "@netcracker/qubership-apihub-apispec-view-diff-elements-core/hooks/useDescriptionWithMeta";
import { MarkdownViewer } from "@netcracker/qubership-apihub-apispec-view-diff-elements-core/components/MarkdownViewer";
import { buildOpenApiDiffCause } from "@netcracker/qubership-apihub-api-doc-viewer";

export type DescriptionProps = {
  id: string,
  data: any
}

export const Description: React.FC<DescriptionProps> = (props: DescriptionProps) => {
  const { id, data } = props
  const [description, descriptionMeta] = useDescriptionWithMeta(data);
  const descriptionDiffCause = buildOpenApiDiffCause(descriptionMeta)

  return (
    <DiffBlock
      id={id}
      type={descriptionMeta?.type}
      action={descriptionMeta?.action}
      cause={descriptionDiffCause}
    >
      {description && <MarkdownViewer markdown={description} className="HttpOperation__Description" />}
    </DiffBlock>
  )
}
Description.displayName = 'HttpOperation.Description'
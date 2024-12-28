import * as React from "react";
import { FC } from "react";
import { Heading, HStack } from "@stoplight/mosaic";
import { DeprecatedBadge } from "@stoplight/diff-elements-core";
import { InternalBadge } from "@stoplight/diff-elements-core/components/Docs/HttpOperation/Badges";
import { DiffBlock, useValueFromObjWithDiff, WithDiffMetaKey } from "diff-block";
import { Diff } from "@netcracker/qubership-apihub-api-diff";
import { buildOpenApiDiffCause } from "@netcracker/qubership-apihub-api-doc-viewer";

export type SummaryProps = {
  data?: WithDiffMetaKey<unknown>
  diffMeta?: Diff
  noHeading?: boolean
}

export const Summary: FC<SummaryProps> = (props) => {
  const {
    data,
    diffMeta,
    noHeading = false,
  } = props

  const diffCause = buildOpenApiDiffCause(diffMeta)

  const summary = useValueFromObjWithDiff(data, 'summary') as string;
  const iid = useValueFromObjWithDiff(data, 'iid') as string;
  const operationId = useValueFromObjWithDiff(data, 'operationId') as string;
  const prettyName = (summary || operationId || iid || '').trim();

  const isDeprecated = !!useValueFromObjWithDiff(data, 'deprecated');
  const isInternal = !!useValueFromObjWithDiff(data, 'internal');

  return (
    <DiffBlock
      id="HttpOperation__Header"
      type={diffMeta?.type}
      action={diffMeta?.action}
      cause={diffCause}
    >
      <HStack spacing={5}>
        {!noHeading && prettyName ? (
          <Heading size={1} fontWeight="semibold">
            {prettyName}
          </Heading>
        ) : null}

        <HStack spacing={2}>
          {isDeprecated && <DeprecatedBadge/>}
          {isInternal && <InternalBadge isHttpService/>}
        </HStack>
      </HStack>
    </DiffBlock>
  )
}
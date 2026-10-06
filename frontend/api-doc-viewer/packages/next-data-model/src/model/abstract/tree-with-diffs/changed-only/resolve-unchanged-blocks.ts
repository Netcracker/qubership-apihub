import { NodeId } from "@apihub/next-data-model/utility-types"

export type UnchangedBlockMembership =
  | { visible: true }
  | { visible: false; unchangedBlockId: NodeId; isBlockStart: boolean; blockSize: number }

export type UnchangedVisibleItem<N> =
  | { kind: "node"; node: N; sourceIndex: number }
  | { kind: "placeholder"; unchangedBlockId: NodeId; blockSize: number; sourceIndex: number }

export type ResolveUnchangedBlocksResult<N> = {
  memberships: UnchangedBlockMembership[]
  visibleSequence: UnchangedVisibleItem<N>[]
}

export function resolveUnchangedBlocks<N extends { id: NodeId }>(
  children: readonly N[],
  isChanged: (node: N) => boolean,
  hideUnchangedNodes: boolean,
): ResolveUnchangedBlocksResult<N> {
  if (!hideUnchangedNodes) {
    const memberships: UnchangedBlockMembership[] = children.map(() => ({ visible: true }))
    const visibleSequence: UnchangedVisibleItem<N>[] = children.map((node, sourceIndex) => ({
      kind: "node",
      node,
      sourceIndex,
    }))
    return { memberships, visibleSequence }
  }

  const memberships: UnchangedBlockMembership[] = []
  const visibleSequence: UnchangedVisibleItem<N>[] = []
  let index = 0

  while (index < children.length) {
    if (isChanged(children[index])) {
      memberships.push({ visible: true })
      visibleSequence.push({ kind: "node", node: children[index], sourceIndex: index })
      index++
      continue
    }

    const blockStart = index
    while (index < children.length && !isChanged(children[index])) {
      index++
    }
    const unchangedBlockId = children[blockStart].id
    const blockSize = index - blockStart

    for (let position = blockStart; position < index; position++) {
      memberships.push({
        visible: false,
        unchangedBlockId,
        isBlockStart: position === blockStart,
        blockSize,
      })
    }

    visibleSequence.push({
      kind: "placeholder",
      unchangedBlockId,
      blockSize,
      sourceIndex: blockStart,
    })
  }

  return { memberships, visibleSequence }
}

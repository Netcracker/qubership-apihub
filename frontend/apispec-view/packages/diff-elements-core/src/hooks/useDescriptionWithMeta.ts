import { Diff } from '@netcracker/qubership-apihub-api-diff';
import { combineDiffMetas, useValueFromObjWithDiff, WithDiffMetaKey } from '@netcracker/qubership-apihub-apispec-view-diff-block';
import { pick } from 'lodash';
import { useDiffsMetaKey } from "@netcracker/qubership-apihub-apispec-view/containers/DiffsMetaKeyContext";

export function useDescriptionWithMeta(data: WithDiffMetaKey<unknown>): [string, Diff | undefined] {
  const diffMetaKey = useDiffsMetaKey()
  const diffMeta = data[diffMetaKey];
  const description = useValueFromObjWithDiff(data, 'description') as string;
  const descriptionMeta = combineDiffMetas(pick(diffMeta, ['description']));

  return [description, descriptionMeta];
}

import { Diff } from '@netcracker/qubership-apihub-api-diff';
import { combineDiffMetas, useValueFromObjWithDiff, WithDiffMetaKey } from 'diff-block';
import { pick } from 'lodash';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

export function useDescriptionWithMeta(data: WithDiffMetaKey<unknown>): [string, Diff | undefined] {
  const diffMetaKey = useDiffMetaKey()
  const diffMeta = data[diffMetaKey];
  const description = useValueFromObjWithDiff(data, 'description') as string;
  const descriptionMeta = combineDiffMetas(pick(diffMeta, ['description']));

  return [description, descriptionMeta];
}

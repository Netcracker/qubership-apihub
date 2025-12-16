import { useDiffContext } from './DiffContext';
import { applyReplacedFromMeta } from './util';
import { useDiffsMetaKey } from '@stoplight/elements/containers/DiffsMetaKeyContext';
import { DiffAction } from '@netcracker/qubership-apihub-api-diff';

export function useValueFromObjWithDiff(data: any, key: string): unknown {
  const diffMetaKey = useDiffsMetaKey();
  const { side } = useDiffContext();

  const value = data?.[key];
  const diffMetaValue = data?.[diffMetaKey]?.[key];

  if (side === 'before') {
    switch (diffMetaValue?.action) {
      case DiffAction.rename:
      case DiffAction.replace:
        return applyReplacedFromMeta(value, diffMetaValue);
      case DiffAction.add:
        return undefined;
      case DiffAction.remove:
        return value;
    }
  }

  if (side === 'after') {
    switch (diffMetaValue?.action) {
      case DiffAction.rename:
      case DiffAction.replace:
      case DiffAction.add:
        return value;
      case DiffAction.remove:
        return undefined;
    }
  }

  return value;
}

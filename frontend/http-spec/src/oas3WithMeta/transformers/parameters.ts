import { isPlainObject } from '@stoplight/json';
import type { IBundledHttpService, IComponentNode, Reference } from '@stoplight/types';

import { withContext } from '../../context';
import { isNonNullable } from '../../guards';
import { isReferenceObject, isValidOas3ParameterObject } from '../../oas/guards';
import { getComponentName, setSharedKey, syncReferenceObject } from '../../oas/resolver';
import { entries, pickKeptProperties } from '../../utils';
import { Oas3WithMetaTranslateFunction } from '../types';
import { translateHeaderObject } from './headers';
import { translateParameterObject } from './request';

type ParameterComponents = Pick<
  IBundledHttpService['components'],
  'query' | 'header' | 'path' | 'cookie' | 'unknownParameters'
>;

export const translateToSharedParameters = withContext<
  Oas3WithMetaTranslateFunction<[components: unknown], ParameterComponents>
>(function (components) {
  const sharedParameters: ParameterComponents = {
    header: [],
    query: [],
    cookie: [],
    path: [],
    unknownParameters: [],
    ...pickKeptProperties(components as object, this.keepProperties),
  };

  if (!isPlainObject(components)) return sharedParameters;

  for (const [key, value] of entries(components.headers)) {
    setSharedKey(value, key);

    this.references[`#/components/headers/${key}`] = {
      resolved: true,
      value: `#/components/header/${sharedParameters.header.length}`,
    };

    const header = translateHeaderObject.call(this, [key, value]);
    if (isNonNullable(header)) {
      sharedParameters.header.push({
        ...header,
        key,
      });
    }
  }

  const resolvables: (Reference & IComponentNode)[] = [];

  for (const [key, value] of entries(components.parameters)) {
    setSharedKey(value, key);

    if (isReferenceObject(value)) {
      // note that unlike schemas, we don't handle proxy $refs here
      // we need resolved content to be able to determine the kind of parameter to push it to the correct array
      this.references[`#/components/parameters/${key}`] = {
        resolved: false,
        value: value.$ref,
      };

      resolvables.push(
        syncReferenceObject(
          {
            ...value,
            key,
          },
          this.references,
        ),
      );
      continue;
    }

    if (!isValidOas3ParameterObject(value)) continue;
    const parameter = translateParameterObject.call(this, value);

    this.references[`#/components/parameters/${key}`] = {
      resolved: true,
      value: `#/components/${value.in}/${sharedParameters[value.in].length}`,
    };

    sharedParameters[value.in].push({
      ...(parameter as any),
      key,
    });
  }

  for (const resolvable of resolvables) {
    const kind = getComponentName(this.references, resolvable.$ref);
    // A component parameter that is only a $ref to a definition this document does not
    // contain cannot be sorted into path/query/header/cookie, because the kind is a
    // property of the target and the target is not here. Until @stoplight/types 13.9
    // there was nowhere to put it and it was dropped on the floor - a silent loss of a
    // declared component. `unknownParameters` is exactly that bucket.
    if (kind === void 0 || !(kind in sharedParameters)) {
      sharedParameters.unknownParameters.push(resolvable);
      continue;
    }

    (sharedParameters as any)[kind].push(resolvable);
  }

  return sharedParameters;
});

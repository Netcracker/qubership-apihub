import { isPlainObject } from '@stoplight/json';
import isEqualWith = require('lodash.isequalwith');
import { merge, pick } from 'lodash'

export function entries<T = Record<string, unknown>>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
export function entries<T = unknown>(o: T): [string, T][];
export function entries<T = unknown>(o: T): [string, T][] {
  return isPlainObject(o) ? Object.entries(o as T) : [];
}

export function isEqual(left: unknown, right: unknown) {
  return isEqualWith(left, right, (value, other, indexOrKey) => {
    if (indexOrKey === 'id') return true;
    return;
  });
}

export function pickKeptProperties(data: unknown, keepProperties?: string[]): object {
  if (!keepProperties || keepProperties.length === 0 || !data || !isPlainObject(data)) {
    return {};
  }
  return keepProperties
    .map(property => {
      const symbolKey = Reflect.ownKeys(data).find(key => key.toString() === property) ?? property;
      if (data?.[symbolKey]) {
        return pick(data, symbolKey);
      }

      return {};
    })
    .reduce((acc, next) => merge(acc, next));
}

export function getKeptPropertiesValues(data: unknown, keepProperties?: string[]): object {
  if (!keepProperties || keepProperties.length === 0 || !data || !isPlainObject(data)) {
    return {};
  }
  return keepProperties.reduce((acc, property) => {
    const symbolKey = Reflect.ownKeys(data).find(key => key.toString() === property) ?? property;
    if (data?.[symbolKey]) {
      const values = data[symbolKey];
      return { ...acc, ...(typeof values === 'object' ? values : {}) };
    }

    return acc;
  }, {});
}

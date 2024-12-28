import { createContext as _createContext } from '../context';
import { hash } from '../hash';
import type { Fragment, TransformerContext } from '../types';
import { resolveRef as _resolveRef } from './resolver';

export function createContext<T extends Fragment>(
  document: T,
  resolveRef = _resolveRef,
  keepProperties?: string[],
): TransformerContext<T> {
  return _createContext<T>(document, resolveRef, hash, keepProperties);
}

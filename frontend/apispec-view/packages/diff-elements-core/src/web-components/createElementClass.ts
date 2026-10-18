import { safeParse, safeStringify } from '@stoplight/json';
import { Optional } from '@stoplight/types';
import { isEqual, mapValues } from 'lodash';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

type TypeNameMap<T> = T extends string
  ? 'string'
  : T extends number
  ? 'number'
  : T extends boolean
  ? 'boolean'
  : T extends undefined
  ? 'undefined'
  : T extends Function
  ? 'function'
  : 'object';

type PropDescriptor<T> = {
  type: TypeNameMap<T>;
} & (T extends undefined ? { defaultValue?: undefined } : { defaultValue: T });

type PropDescriptorMap<P> = {
  [K in keyof Complete<P>]: PropDescriptor<P[K]>;
};

type Complete<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined;
};

export const createElementClass = <P>(
  Component: React.ComponentType<P>,
  propDescriptors: PropDescriptorMap<P>,
  additionalNodes?: Node[],
): new () => HTMLElement => {
  return class extends HTMLElement {
    private _mountPoint: HTMLElement | undefined;
    private _shadow: ShadowRoot | undefined;
    /* React 18 requires one root per container, created once and reused for every
       subsequent render, so it is held per element rather than re-derived. */
    private _root: Root | undefined;
    private _props: Partial<P> = {};

    static get observedAttributes() {
      return Object.keys(propDescriptors);
    }

    constructor() {
      super();

      // define getters and setters for all properties
      Object.defineProperties(
        this,
        mapValues(propDescriptors, (_, key) => ({
          get: () => {
            return this._props[key];
          },
          set: (newValue: any) => {
            if (this._props[key] === newValue) {
              return;
            }
            this._props[key] = newValue;
            this._renderComponent();
            this._safeWriteAttribute(key as keyof P & string, newValue);
          },
          enumerable: true,
        })),
      );
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      if (propDescriptors[name]) {
        const newPropValue = this._safeReadAttribute(name as keyof P & string);
        if (!isEqual(this._props[name], newPropValue)) {
          this._props[name] = newPropValue;
          this._renderComponent();
        }
      }
    }

    connectedCallback() {
      this._mountPoint = document.createElement('div');
      this._shadow = this.attachShadow({ mode: 'closed' });
      if (additionalNodes) {
        this._shadow.append(...additionalNodes);
      }
      this._shadow.appendChild(this._mountPoint);
      this._mountPoint.style.height = '100%';
      this._root = createRoot(this._mountPoint);

      for (const key in propDescriptors) {
        if (propDescriptors.hasOwnProperty(key)) {
          this._props[key] = this._safeReadAttribute(key);
        }
      }

      this._renderComponent();
    }

    disconnectedCallback() {
      /* Unmount through the root before detaching the mount point: the root owns the
         container. A reconnected element gets a fresh shadow, mount point and root from
         connectedCallback. */
      if (this._root) {
        this._root.unmount();
        this._root = undefined;
      }
      if (this._mountPoint) {
        if (additionalNodes) {
          additionalNodes.forEach(node => this._shadow?.removeChild(node));
        }
        this._shadow?.removeChild(this._mountPoint);
        this._mountPoint = undefined;
      }
    }

    private _safeReadAttribute<A extends keyof P & string>(attrName: A): Optional<P[A]> {
      if (!this.hasAttribute(attrName) || !propDescriptors[attrName]) {
        return undefined;
      }
      const attrValue = this.getAttribute(attrName);
      const type = propDescriptors[attrName].type;
      if (type === 'string') {
        return (attrValue ?? undefined) as Optional<P[A]>;
      }
      if (type === 'number') {
        return (attrValue ? Number(attrValue) : undefined) as Optional<P[A]>;
      }
      if (type === 'boolean') {
        let result = undefined;
        if (attrValue === 'true') {
          result = true;
        } else if (attrValue === 'false') {
          result = false;
        }
        return result as Optional<P[A]>;
      }
      if (type === 'object') {
        return safeParse(attrValue ?? '') as Optional<P[A]>;
      }

      return undefined;
    }

    private _safeWriteAttribute<A extends keyof P & string>(attrName: A, newValue: P[A]) {
      if (!propDescriptors[attrName]) {
        return;
      }

      if (!newValue) {
        this.removeAttribute(attrName);
        return;
      }

      const type = propDescriptors[attrName].type;
      this.setAttribute(attrName, stringifyValue(newValue));

      function stringifyValue(val: P[A]): string {
        if (type === 'string' || type === 'number' || type === 'boolean') {
          return String(val);
        }

        if (type === 'object') {
          return safeStringify(val) || '';
        }

        return '';
      }
    }

    private _renderComponent() {
      if (this._root) {
        const props = mapValues(propDescriptors, (descriptor, key) => this._props[key] ?? descriptor.defaultValue);
        this._root.render(React.createElement(Component, props));
      }
    }
  };
};

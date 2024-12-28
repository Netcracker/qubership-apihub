import { isPlainObject } from '@stoplight/json';
import type { HttpSecurityScheme, IHttpOperation, Optional } from '@stoplight/types';
import { pickBy } from 'lodash';

import { withContext } from '../context';
import { isNonNullable } from '../guards';
import { createContext } from '../oas/context';
import { bundleResolveRef } from '../oas/resolver';
import { transformOasService } from '../oas/service';
import { translateToComponents } from '../oas/transformers/components';
import { translateSchemaObjectFromPair } from '../oas/transformers/schema';
import type { Oas3HttpServiceBundle, Oas3HttpServiceTransformer } from '../oas/types';
import { OasVersion } from '../oas/types';
import type { ArrayCallbackParameters } from '../types';
import { entries, pickKeptProperties } from '../utils';
import { isSecurityScheme } from './guards';
import { transformOas3WithMetaOperations } from './operation';
import { translateToExample } from './transformers/examples';
import { translateToSharedParameters } from './transformers/parameters';
import { translateRequestBody } from './transformers/request';
import { translateToResponse } from './transformers/responses';
import { translateToSingleSecurity } from './transformers/securities';
import { translateToServer } from './transformers/servers';
import type { Oas3WithMetaTranslateFunction } from './types';

export const bundleOas3WithMetaService: Oas3HttpServiceBundle = ({ document: _document, keepProperties }) => {
  const ctx = createContext(_document, bundleResolveRef, keepProperties);
  const { document } = ctx;

  const { securitySchemes, ...service } = transformOas3WithMetaService({ document, ctx });
  const components = {
    ...translateToComponents.call(ctx, OasVersion.OAS3, {
      responses: translateToResponse,
      requestBodies: translateRequestBody,
      examples: translateToExample,
      schemas: translateSchemaObjectFromPair,
      securitySchemes: translateSecurityScheme,
    }),
    ...translateToSharedParameters.call(ctx, document.components),
  };

  const operations = transformOas3WithMetaOperations(document, ctx) as unknown as IHttpOperation<true>[];

  return {
    ...service,
    operations,
    components,
    ...pickKeptProperties(document, ctx.keepProperties),
  };
};

export const transformOas3WithMetaService: Oas3HttpServiceTransformer = ({
  document: _document,
  keepProperties: _keepProperties,
  ctx = createContext(_document, undefined, _keepProperties),
}) => {
  const { document, keepProperties } = ctx;
  const httpService = transformOasService.call(ctx);

  if (typeof document.info?.summary === 'string') {
    httpService.summary = document.info.summary;
  }

  if (document.info?.license) {
    const { name, identifier, ...license } = document.info.license;
    httpService.license = {
      ...license,
      name: typeof name === 'string' ? name : '',
      ...(typeof identifier === 'string' && { identifier }),
    };
  }

  const servers = Array.isArray(document.servers)
    ? document.servers.map(translateToServer, ctx).filter(isNonNullable)
    : [];

  if (servers.length) {
    httpService.servers = servers;
  }

  const securitySchemes = entries(document.components?.securitySchemes)
    .map(translateSecurityScheme, ctx)
    .filter(isNonNullable);

  if (securitySchemes.length) {
    httpService.securitySchemes = securitySchemes;
  }

  const security = (Array.isArray(document.security) ? document.security : [])
    .flatMap(sec => {
      if (!isPlainObject(sec)) return null;

      return Object.keys(sec).map(key => {
        const ss = securitySchemes.find(securityScheme => securityScheme.key === key);
        if (ss && ss.type === 'oauth2') {
          const flows = {};
          for (const flowKey in ss.flows) {
            const flow = ss.flows[flowKey];
            flows[flowKey] = {
              ...flow,
              scopes: pickBy(flow.scopes, (_val: string, scopeKey: string) => {
                const secKey = sec[key];
                if (secKey) return secKey.includes(scopeKey);
                return false;
              }),
            };
          }

          return {
            ...ss,
            flows,
            ...pickKeptProperties(ss, keepProperties),
          };
        }

        return { ...ss, ...pickKeptProperties(sec, keepProperties) };
      });
    })
    .filter(isNonNullable);

  if (security.length) {
    httpService.security = security as HttpSecurityScheme[];
  }

  return {
    ...httpService,
    ...pickKeptProperties(document, keepProperties),
    ...pickKeptProperties(document.info, keepProperties),
  };
};

const translateSecurityScheme = withContext<
  Oas3WithMetaTranslateFunction<ArrayCallbackParameters<[name: string, scheme: unknown]>, Optional<HttpSecurityScheme>>
>(function ([key, definition]) {
  if (!isSecurityScheme(definition)) return;

  return translateToSingleSecurity.call(this, [key, definition]);
});

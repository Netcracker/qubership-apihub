import { Extension, ExtensionMeta } from '@stoplight/diff-elements-core/components/Docs/Extensions';
import { ExtensionsDiff } from '@stoplight/diff-elements-core/components/Docs/ExtensionsDiff';
import { VStack } from '@stoplight/mosaic';
import { HttpSecurityScheme, IHttpOperation } from '@stoplight/types';
import { DiffBlock, DiffContainer } from 'diff-block';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { flatten, isEmpty } from 'lodash';
import * as React from 'react';

import { getReadableSecurityName, shouldIncludeKey } from '../../../utils/oas/security';
import { getDefaultDescription } from '../../../utils/securitySchemes';
import { MarkdownViewer } from '../../MarkdownViewer';
import { SectionSubtitle, SectionTitle, SubSectionPanel } from '../Sections';
import { Body, isBodyEmpty } from './Body';
import { Parameters } from './Parameters';
import { Diff, DiffMetaRecord } from "@netcracker/qubership-apihub-api-diff";
import { buildOpenApiDiffCause } from "@netcracker/qubership-apihub-api-doc-viewer";

interface IRequestProps {
  operation: IHttpOperation;
  onChange: (requestBodyIndex: number) => void;
  extensions: Extension[];
  extensionsMeta: ExtensionMeta;
  securityMeta: Diff | DiffMetaRecord;
}

export const Request: React.FunctionComponent<IRequestProps> = ({
  operation: {
    request,
    request: {
      path: pathParams = [],
      headers: headerParams = [],
      cookie: cookieParams = [],
      body,
      query: queryParams = [],
    } = {},
    security,
  },
  onChange,
  extensions,
  extensionsMeta,
  securityMeta,
}) => {
  if (!request || typeof request !== 'object') {
    return null;
  }

  const bodyIsEmpty = isBodyEmpty(body);
  const securitySchemes = flatten(security);
  const hasRequestData = Boolean(
    securitySchemes.length ||
      pathParams.length ||
      queryParams.length ||
      headerParams.length ||
      cookieParams.length ||
      !bodyIsEmpty,
  );

  if (!hasRequestData) {
    return null;
  }

  const isWholeSecuritySectionMeta = !securityMeta?.hasOwnProperty('array');
  const outerSecurityMeta = (isWholeSecuritySectionMeta ? securityMeta : null) as Diff;
  const outerSecurityMetaCause = buildOpenApiDiffCause(outerSecurityMeta)
  const innerSecurityMeta = (!isWholeSecuritySectionMeta ? securityMeta : null) as DiffMetaRecord;

  return (
    <VStack spacing={8}>
      <DiffContainer>
        <SectionTitle title="Request" />
      </DiffContainer>

      {securitySchemes.length > 0 && (
        <DiffContainer>
          <DiffBlock
            id='Security_Whole'
            type={outerSecurityMeta?.type}
            action={outerSecurityMeta?.action}
            cause={outerSecurityMetaCause}
          >
            <VStack spacing={3}>
              {securitySchemes.map((scheme, i) => {
                const diff = innerSecurityMeta?.[i] as Diff;
                const diffCause = buildOpenApiDiffCause(diff)
                return (
                  <DiffBlock
                    id={`Security-${i}`}
                    key={i}
                    type={diff?.type}
                    action={diff?.action}
                    cause={diffCause}
                  >
                    <SecurityPanel scheme={scheme} includeKey={shouldIncludeKey(securitySchemes, scheme.type)} />
                  </DiffBlock>
                );
              })}
            </VStack>
          </DiffBlock>
        </DiffContainer>
      )}

      {!isEmpty(extensions) && (
        <DiffContainer>
          <ExtensionsDiff idPrefix={'HttpOperation__Request_Extensions'} value={extensions} meta={extensionsMeta} />
        </DiffContainer>
      )}

      {pathParams.length > 0 && (
        <VStack spacing={5}>
          <DiffContainer>
            <SectionSubtitle title="Path Parameters" />
          </DiffContainer>
          {/* @ts-expect-error // Original type definitions != real types */}
          <Parameters parameterType="path" parameters={pathParams} />
        </VStack>
      )}

      {queryParams.length > 0 && (
        <VStack spacing={5}>
          <DiffContainer>
            <SectionSubtitle title="Query Parameters" />
          </DiffContainer>
          {/* @ts-expect-error // Original type definitions != real types */}
          <Parameters parameterType="query" parameters={queryParams} />
        </VStack>
      )}

      {headerParams.length > 0 && (
        <VStack spacing={5}>
          <DiffContainer>
            <SectionSubtitle title="Headers" id="request-headers" />
          </DiffContainer>
          {/* @ts-expect-error // Original type definitions != real types */}
          <Parameters parameterType="header" parameters={headerParams} />
        </VStack>
      )}

      {cookieParams.length > 0 && (
        <VStack spacing={5}>
          <DiffContainer>
            <SectionSubtitle title="Cookies" id="request-cookies" />
          </DiffContainer>
          {/* @ts-expect-error // Original type definitions != real types */}
          <Parameters parameterType="cookie" parameters={cookieParams} />
        </VStack>
      )}

      {body && <Body onChange={onChange} body={body} />}
    </VStack>
  );
};
Request.displayName = 'HttpOperation.Request';

const schemeExpandedState = atomWithStorage<Record<string, boolean>>('HttpOperation_security_expanded', {});

const SecurityPanel: React.FC<{ scheme: HttpSecurityScheme; includeKey: boolean }> = ({ scheme, includeKey }) => {
  const [expandedState, setExpanded] = useAtom(schemeExpandedState);

  return (
    <SubSectionPanel
      title={`Security: ${getReadableSecurityName(scheme, includeKey)}`}
      defaultIsOpen={expandedState[scheme.key]}
      isOpen={expandedState[scheme.key]}
      onChange={isOpen => setExpanded({ ...expandedState, [scheme.key]: isOpen })}
    >
      <MarkdownViewer
        style={{ fontSize: 12 }}
        markdown={`${scheme.description || ''}\n\n` + getDefaultDescription(scheme)}
      />
    </SubSectionPanel>
  );
};

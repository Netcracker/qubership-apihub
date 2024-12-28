import { useParsedValue } from './useParsedValue'
import { useBundleRefsIntoDocument } from './useBundleRefsIntoDocument'
import * as React from 'react'
import { useMemo } from 'react'
import { merge } from 'allof-merge'
import { transformOasToServiceNode } from '../utils/oas'
import { IHttpOperation } from '@stoplight/types'

export function useTransformDocumentToNode(document: string): IHttpOperation<false> | null {
  const parsedDocument = useParsedValue(document)
  const bundledDocument = useBundleRefsIntoDocument(useMemo(() => merge(parsedDocument), [parsedDocument]))

  return React.useMemo(() => {
    return transformOasToServiceNode(bundledDocument, true)?.children?.find(({ type }) => type === 'http_operation')
      ?.data as IHttpOperation | null
  }, [bundledDocument])
}

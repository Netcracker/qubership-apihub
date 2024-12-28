import { BlockquoteComponent } from '@stoplight/diff-elements-core/components/MarkdownViewer/CustomComponents/BlockquoteComponent';
import {
  CustomComponentMapping as MDVCustomComponentMapping,
  MarkdownViewerProvider,
} from '@stoplight/markdown-viewer';
import * as React from 'react';

import { CodeComponent } from './CodeComponent';

export type CustomComponentMapping = MDVCustomComponentMapping;

interface MarkdownComponentsProviderProps {
  value: Partial<CustomComponentMapping> | undefined;
}

/**
 * Provides components to markdown-viewer.
 */
export const MarkdownComponentsProvider: React.FC<MarkdownComponentsProviderProps> = ({ value, children }) => {
  return (
    <MarkdownViewerProvider components={{ code: CodeComponent!, blockquote: BlockquoteComponent!, ...value }}>
      {children}
    </MarkdownViewerProvider>
  );
};

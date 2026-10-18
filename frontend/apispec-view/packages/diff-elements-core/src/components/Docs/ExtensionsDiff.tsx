import { Box } from '@stoplight/mosaic';
import React, { FC } from 'react';

import { Extension, ExtensionMeta } from './Extensions';
import { ExtensionsDiffBlock } from './ExtensionsDiffBlock';
import { SectionSubtitle } from './Sections';

interface ExtensionsDiffProps {
  idPrefix: string;
  value: Extension[];
  meta: ExtensionMeta;
}

export const ExtensionsDiff: FC<ExtensionsDiffProps> = ({ idPrefix, value, meta }) => {
  return (
    // @ts-ignore
    <Box style={{ '--color-border': 'none' }}>
      <Box mt={8} mb={4}>
        <SectionSubtitle title="Custom Properties" id={`${idPrefix}-custom-properties-title`} />
      </Box>
      {value.map((extension, index) => (
        <ExtensionsDiffBlock key={index} idPrefix={idPrefix} index={index} meta={meta} value={extension} />
      ))}
    </Box>
  );
};

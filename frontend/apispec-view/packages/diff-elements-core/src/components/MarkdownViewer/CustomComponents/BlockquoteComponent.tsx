import { CustomComponentMapping } from '@stoplight/diff-elements-core';
import { Box } from '@stoplight/mosaic';
import React from 'react';

export const BlockquoteComponent: CustomComponentMapping['blockquote'] = props => {
  return (
    <Box style={{ borderLeft: '0.25rem solid lightblue', paddingLeft: '1rem', marginBottom: '20px' }} {...props} />
  );
};

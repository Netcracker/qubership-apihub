import { faEye } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@stoplight/mosaic';
import React from 'react';

import { badgeDefaultBackgroundColor, badgeDefaultColor } from '../../../constants';

export const DeprecatedBadge: React.FC = () => (
  <Badge intent="warning" icon={['fas', 'exclamation-circle']} data-testid="badge-deprecated">
    Deprecated
  </Badge>
);

export const InternalBadge: React.FC<{ isHttpService?: boolean }> = ({ isHttpService }) => (
  <Badge icon={faEye} data-testid="badge-internal" bg="danger">
    Internal
  </Badge>
);

export const VersionBadge: React.FC<{ value: string; backgroundColor?: string }> = ({ value, backgroundColor }) => (
  <Badge
    appearance="solid"
    size="sm"
    border={0}
    style={{
      backgroundColor: backgroundColor || badgeDefaultBackgroundColor,
      color: badgeDefaultColor,
    }}
  >
    {enhanceVersionString(value)}
  </Badge>
);

const enhanceVersionString = (version: string): string => {
  if (version[0] === 'v') {
    return version;
  }

  return `v${version}`;
};

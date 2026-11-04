import type { Actor } from '../../types.ts';
import { Avatar } from '../common/Avatar.tsx';

// The token owner, as GitHub shows the signed-in user at the top right (DATA-26).
export function ViewerBadge({ viewer }: { viewer: Actor }) {
  return (
    <a className="viewer-badge" href={'https://github.com/' + encodeURIComponent(viewer.login)} target="_blank" rel="noopener"
      title={'Live data read with the token of ' + viewer.login}>
      <Avatar actor={viewer} />
      <span className="who">{viewer.login}</span>
    </a>
  );
}

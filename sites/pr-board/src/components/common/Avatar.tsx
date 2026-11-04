import { useState } from 'react';
import { initials } from '../../board/format.ts';
import type { Actor } from '../../types.ts';

// Initials stand in when there is no image or it fails (TABLE-9). The failure belongs to that address, so a cell that
// shows another person next does not keep the initials.
export function Avatar({ actor, small = false }: { actor: Actor | null; small?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cls = 'avatar' + (small ? ' sm' : '');
  const url = actor ? actor.avatarUrl : null;
  if (!actor || !url || failedUrl === url) {
    return <span className={cls} aria-hidden="true">{actor ? initials(actor.login) : '?'}</span>;
  }
  return <img className={cls} src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} />;
}

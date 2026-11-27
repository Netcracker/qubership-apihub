import { useContext } from 'react';
import { displayLogin } from '../../board/format.ts';
import { RulesContext } from '../../context.ts';
import { isBot } from '../../model/rules.ts';
import { GHOST_LOGIN } from '../../types.ts';
import type { Actor } from '../../types.ts';
import { Avatar } from './Avatar.tsx';

export function Person({ actor }: { actor: Actor | null }) {
  const { extraBots } = useContext(RulesContext);
  if (!actor) {
    return (
      <div className="person ghost" title="The author's GitHub account was deleted">
        <Avatar actor={null} /><span className="login">{GHOST_LOGIN}</span>
      </div>
    );
  }
  return (
    <div className="person">
      <Avatar actor={actor} />
      <span className="login">{displayLogin(actor)}</span>
      {isBot(actor, extraBots) ? <span className="chip bot">bot</span> : null}
    </div>
  );
}

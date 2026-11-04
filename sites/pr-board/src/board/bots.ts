import { parseList, uniqueNames } from '../names.ts';

export const MAX_BOTS = 50;
export const BOTS_VARIABLE = 'PR_BOARD_BOTS';

// GitHub logins have letters, digits, and inner dashes; apps can end in [bot].
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?(?:\[bot\])?$/;

export function cleanBots(logins: string[]): string[] {
  return uniqueNames(logins.filter((login) => LOGIN.test(login))).slice(0, MAX_BOTS);
}

export function parseBuildBots(text: string): string[] {
  const logins = parseList(text);
  const wrong = logins.find((login) => !LOGIN.test(login));
  if (wrong !== undefined) throw new Error(BOTS_VARIABLE + ': "' + wrong + '" is not a GitHub login.');
  if (logins.length > MAX_BOTS) throw new Error(BOTS_VARIABLE + ': at most ' + MAX_BOTS + ' extra bot logins are allowed.');
  return logins;
}

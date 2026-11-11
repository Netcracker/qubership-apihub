// Human-readable lines for the changes of one jdiff element, e.g. `[Removed] method 'getIds()'`.
// japicmp change codes read as `<SUBJECT>_<ACTION>[_<QUALIFIER>]`, e.g. `METHOD_RETURN_TYPE_CHANGED`
// or `METHOD_REMOVED_IN_SUPERCLASS`; a code that does not fit that shape is shown as plain words.

const ACTION_TITLES: Readonly<Record<string, string>> = {
  ADDED: 'Added',
  REMOVED: 'Removed',
  CHANGED: 'Changed',
}

const STATUS_TITLES: Readonly<Record<string, string>> = {
  NEW: 'Added',
  REMOVED: 'Removed',
  MODIFIED: 'Changed',
}

// codes whose generic reading would be clumsy
const SPECIAL_CODE_TITLES: Readonly<Record<string, (subject: string) => string>> = {
  ANNOTATION_DEPRECATED_ADDED: subject => `[Deprecated] ${subject}`,
}

/**
 * Describes the changes of one element.
 *
 * @param subject  the element as a reader names it, e.g. `method 'getIds()'`
 * @param kindWord the code word of the element kind, e.g. `METHOD` or `CLASS`
 */
export function describeJavaApiElementChanges(
  status: string,
  changeTypes: readonly string[],
  subject: string,
  kindWord: string,
): string[] {
  if (changeTypes.length === 0) {
    const title = STATUS_TITLES[status]
    return title ? [`[${title}] ${subject}`] : []
  }
  return changeTypes.map(code => describeChangeCode(code, subject, kindWord))
}

function describeChangeCode(code: string, subject: string, kindWord: string): string {
  const special = SPECIAL_CODE_TITLES[code]
  if (special) {
    return special(subject)
  }
  const words = code.split('_')
  const nowIndex = words.indexOf('NOW')
  if (nowIndex > 0) {
    return `[Changed] ${subject} is now ${toPhrase(words.slice(nowIndex + 1))}`
  }
  const actionIndex = words.findIndex(word => word in ACTION_TITLES)
  if (actionIndex <= 0) {
    return `[Changed] ${subject}: ${toPhrase(words)}`
  }
  const action = ACTION_TITLES[words[actionIndex]]
  const before = words.slice(0, actionIndex)
  const qualifier = words.slice(actionIndex + 1)
  // `METHOD_REMOVED` names the element itself; `METHOD_RETURN_TYPE_CHANGED` names a part of it
  const part = before[0] === kindWord ? before.slice(1) : before
  const object = part.length > 0 ? `${toPhrase(part)} of ${subject}` : subject
  return `[${action}] ${object}${qualifier.length > 0 ? ` ${toPhrase(qualifier)}` : ''}`
}

function toPhrase(words: readonly string[]): string {
  return words.join(' ').toLowerCase()
}

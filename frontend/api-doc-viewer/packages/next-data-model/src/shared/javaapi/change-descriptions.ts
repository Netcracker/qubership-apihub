import { JdiffStatuses } from './types/jdiff-status'

// Human-readable lines for the changes of one jdiff element, e.g. `[Removed] method 'getIds()'`.
// japicmp change codes read as `<SUBJECT>_<ACTION>[_<QUALIFIER>]`, e.g. `METHOD_RETURN_TYPE_CHANGED`
// or `METHOD_REMOVED_IN_SUPERCLASS`; a code that does not fit that shape is shown as plain words.

// japicmp names every type kind `CLASS` in its codes, e.g. `CLASS_REMOVED` for an interface
export const JAPICMP_TYPE_CODE_WORD = 'CLASS'

const ACTION_TITLES: Readonly<Record<string, string>> = {
  ADDED: 'Added',
  REMOVED: 'Removed',
  CHANGED: 'Changed',
}

const STATUS_TITLES: Readonly<Record<string, string>> = {
  [JdiffStatuses.NEW]: ACTION_TITLES.ADDED,
  [JdiffStatuses.REMOVED]: ACTION_TITLES.REMOVED,
  [JdiffStatuses.MODIFIED]: ACTION_TITLES.CHANGED,
}

// codes whose generic reading would be clumsy, e.g. `METHOD_NOW_THROWS_CHECKED_EXCEPTION` as `is now throws checked
// exception`
const SPECIAL_CODE_TITLES: Readonly<Record<string, (subject: string) => string>> = {
  ANNOTATION_DEPRECATED_ADDED: subject => `[Deprecated] ${subject}`,
  CLASS_NOW_CHECKED_EXCEPTION: subject => `[${ACTION_TITLES.CHANGED}] ${subject} is now a checked exception`,
  INTERFACE_ADDED: subject => `[${ACTION_TITLES.ADDED}] superinterface of ${subject}`,
  INTERFACE_REMOVED: subject => `[${ACTION_TITLES.REMOVED}] superinterface of ${subject}`,
  METHOD_ABSTRACT_ADDED_IN_IMPLEMENTED_INTERFACE: subject =>
    `[${ACTION_TITLES.ADDED}] abstract method in an implemented interface of ${subject}`,
  METHOD_DEFAULT_ADDED_IN_IMPLEMENTED_INTERFACE: subject =>
    `[${ACTION_TITLES.ADDED}] default method in an implemented interface of ${subject}`,
  METHOD_NOW_THROWS_CHECKED_EXCEPTION: subject =>
    `[${ACTION_TITLES.CHANGED}] ${subject} now throws a checked exception`,
  // japicmp reports it on the class whose superclass gained the abstract method
  METHOD_ABSTRACT_ADDED_IN_SUPERCLASS: subject =>
    `[${ACTION_TITLES.ADDED}] abstract method in the superclass of ${subject}`,
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
  const state = findStateAfterNow(words)
  if (state) {
    return `[${ACTION_TITLES.CHANGED}] ${subject} is now ${toPhrase(state)}`
  }
  const actionCode = splitAtActionWord(words)
  if (!actionCode) {
    return `[${ACTION_TITLES.CHANGED}] ${subject}: ${toPhrase(withoutKindWord(words, kindWord))}`
  }
  const { target, actionWord, qualifier } = actionCode
  const object = describeTarget(target, kindWord, subject)
  return `[${ACTION_TITLES[actionWord]}] ${object}${describeQualifier(qualifier)}`
}

type ActionCode = {
  readonly target: string[]
  readonly actionWord: string
  readonly qualifier: string[]
}

// `CLASS_NOW_ABSTRACT` -> ['ABSTRACT']; undefined when no subject word comes before `NOW`
function findStateAfterNow(words: readonly string[]): string[] | undefined {
  const nowIndex = words.indexOf('NOW')
  return nowIndex > 0 ? words.slice(nowIndex + 1) : undefined
}

// `METHOD_REMOVED_IN_SUPERCLASS` -> { target: ['METHOD'], actionWord: 'REMOVED', qualifier: ['IN', 'SUPERCLASS'] }
// undefined when no subject word comes before the action word
function splitAtActionWord(words: readonly string[]): ActionCode | undefined {
  const actionIndex = words.findIndex(word => word in ACTION_TITLES)
  if (actionIndex <= 0) {
    return undefined
  }
  return {
    target: words.slice(0, actionIndex),
    actionWord: words[actionIndex],
    qualifier: words.slice(actionIndex + 1),
  }
}

// `METHOD_REMOVED` names the element itself; `METHOD_RETURN_TYPE_CHANGED` names a part of it:
// ['METHOD'] -> `method 'getIds()'`, ['METHOD', 'RETURN', 'TYPE'] -> `return type of method 'getIds()'`
function describeTarget(target: readonly string[], kindWord: string, subject: string): string {
  const part = withoutKindWord(target, kindWord)
  return part.length > 0 ? `${toPhrase(part)} of ${subject}` : subject
}

// omit the kind prefix, e.g. ['FIELD', 'LESS', 'ACCESSIBLE'] -> ['LESS', 'ACCESSIBLE'] for `FIELD`
function withoutKindWord(words: readonly string[], kindWord: string): readonly string[] {
  return words[0] === kindWord ? words.slice(1) : words
}

// ['IN', 'SUPERCLASS'] -> ` in superclass`; [] -> ``
function describeQualifier(qualifier: readonly string[]): string {
  return qualifier.length > 0 ? ` ${toPhrase(qualifier)}` : ''
}

function toPhrase(words: readonly string[]): string {
  return words.join(' ').toLowerCase()
}

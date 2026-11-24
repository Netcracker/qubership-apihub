export type AsyncApiActionBadgeConfig = {
  /** Background class of the badge; its color is defined in `components/shared-styles/colors/async-api.css`. */
  readonly colorClass: string
}

/**
 * Operation action badge classes of the address row - the single place to map an action to a color
 * class; the colors themselves live in `components/shared-styles/colors/async-api.css`.
 */
export const ASYNC_API_ACTION_BADGE_CONFIG: Readonly<Record<string, AsyncApiActionBadgeConfig>> = {
  send: { colorClass: 'async-api-action-badge_send' },
  receive: { colorClass: 'async-api-action-badge_receive' },
}

/** An unknown action keeps its text and gets no background class. */
export function resolveAsyncApiActionBadge(action: string): { text: string, colorClass: string } {
  return { text: action.toUpperCase(), colorClass: ASYNC_API_ACTION_BADGE_CONFIG[action]?.colorClass ?? '' }
}

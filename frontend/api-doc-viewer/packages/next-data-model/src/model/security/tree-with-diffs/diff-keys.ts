/**
 * Synthetic field diff on a `security` node: present when any alternative (security toolbar option)
 * was wholly added or removed; its type is the strongest of those changes. Written by the security
 * with-diffs builders (OpenAPI, AsyncAPI), read by the toolbar row accessor and severities.
 */
export const SECURITY_ALTERNATIVES_DIFF_KEY = 'alternatives'

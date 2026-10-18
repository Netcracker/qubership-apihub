/**
 * The prefix is used for identifying test entities, extract test IDs and their later removal from the database.
 *
 * Must contain only **letters**, **numbers** and end with '**-**'.
 */
export const TEST_PREFIX = '1UI-'
/**
 * It must be **'QS'** because, to remove test entities from the database, the alias must match the mask **QS%-testId%**.
 */
export const ALIAS_PREFIX = 'QS'
export const WORKSPACE_PREFIX = 'Workspace'
export const GROUP_PREFIX = 'Group'
export const PACKAGE_PREFIX = 'Package'
export const DASHBOARD_PREFIX = 'Dashboard'

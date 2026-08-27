/**
 * **undefined** (*default*) - create only Non-Reusable test data
 *
 * **all** - create both reusable and Non-Reusable test data
 *
 * **skip** - skip test data creation
 */
export const CREATE_TD = process.env.CREATE_TD as 'all' | 'skip' | undefined

/**
 * **undefined** (*default*) - clear only Non-Reusable test data
 *
 * **all** - clear both reusable and Non-Reusable test data
 *
 * **skip** - skip test data clearing
 */
export const CLEAR_TD = process.env.CLEAR_TD as 'all' | 'skip' | undefined

/** Skip reason when `CREATE_TD === 'skip'`. */
export const MSG_CREATE_TD_SKIPPED = 'Test Data creation is skipped'

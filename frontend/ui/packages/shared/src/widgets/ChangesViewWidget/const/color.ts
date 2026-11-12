import type { ActionType } from '../../../entities/change-severities'
import { ADD_ACTION_TYPE, REMOVE_ACTION_TYPE, REPLACE_ACTION_TYPE } from '../../../entities/change-severities'

export const ROW_COLOR_MAP: Partial<Record<ActionType, string>> = {
  [ADD_ACTION_TYPE]: '#00BB5B20',
  [REMOVE_ACTION_TYPE]: '#FF526020',
  [REPLACE_ACTION_TYPE]: '#FFB02E20',
}

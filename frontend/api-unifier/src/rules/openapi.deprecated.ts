import { Jso } from '../types'
import { getJsoProperty } from '../utils'
import { OPEN_API_PROPERTY_DEPRECATED } from './openapi.const'

const OPEN_API_DEPRECATION_META_KEY = 'x-deprecated-meta'
const OPEN_API_DEPRECATION_WITHOUT_REASON = ''

export const OPEN_API_DEPRECATION_RESOLVER: (value: Jso) => string | undefined = (value) => {
  if (!getJsoProperty(value, OPEN_API_PROPERTY_DEPRECATED)) {
    return undefined
  } else if (OPEN_API_DEPRECATION_META_KEY in value && typeof value[OPEN_API_DEPRECATION_META_KEY] === 'string') {
    return value[OPEN_API_DEPRECATION_META_KEY]
  } else {
    return OPEN_API_DEPRECATION_WITHOUT_REASON
  }
}

import { Jso } from '../types'
import { getJsoProperty } from '../utils'
import { ASYNCAPI_PROPERTY_DEPRECATED } from './asyncapi.const'

const ASYNCAPI_DEPRECATION_META_KEY = 'x-deprecated-meta'
const ASYNCAPI_DEPRECATION_WITHOUT_REASON = ''

export const ASYNCAPI_DEPRECATION_RESOLVER: (value: Jso) => string | undefined = (value) => {
  if (!getJsoProperty(value, ASYNCAPI_PROPERTY_DEPRECATED)) {
    return undefined
  } else if (ASYNCAPI_DEPRECATION_META_KEY in value && typeof value[ASYNCAPI_DEPRECATION_META_KEY] === 'string') {
    return value[ASYNCAPI_DEPRECATION_META_KEY]
  } else {
    return ASYNCAPI_DEPRECATION_WITHOUT_REASON
  }
}



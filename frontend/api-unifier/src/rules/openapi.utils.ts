import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { OPEN_API_PROPERTY_COMPONENTS } from './openapi.const'

export const startFromOpenApiComponents = (jsonPath: JsonPath): boolean => {
  return jsonPath.length > 0 && jsonPath[0] === OPEN_API_PROPERTY_COMPONENTS
}

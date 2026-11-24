import { OpenAPIV2, OpenAPIV3 } from 'openapi-types'
import oas3 from './schemas/oas3.json'
import oas31 from './schemas/oas31.json'
import swagger from './schemas/swagger.json'

import { REST_DOCUMENT_TYPE, REST_FILE_FORMAT } from './rest.consts'
import { getFileExtension, validateDocument } from '../../utils'
import { FILE_KIND, TextFile } from '../../types'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

//TODO: add unit tests for parseRestFile

export const parseRestFile = async (fileId: string, source: Blob): Promise<TextFile | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === REST_FILE_FORMAT.JSON || sourceString.trimStart().startsWith('{')) {
    if (/\s*?"openapi"\s*?:\s*?"3\.[01]\..+?"/g.test(sourceString)) {
      const data = JSON.parse(sourceString) as OpenAPIV3.Document
      const type = data.openapi.startsWith('3.0') ? REST_DOCUMENT_TYPE.OAS3 : REST_DOCUMENT_TYPE.OAS31

      // validate openapi file
      const errors = validateDocument(type === REST_DOCUMENT_TYPE.OAS3 ? oas3 : oas31, data)

      return { fileId, type, format: REST_FILE_FORMAT.JSON, data, source, errors, kind: FILE_KIND.TEXT }
    }
    if (/\s*?"swagger"\s*?:\s*?"2\..+?"/g.test(sourceString)) {
      const data = JSON.parse(sourceString) as OpenAPIV2.Document

      // validate swagger file
      const errors = validateDocument(swagger, data)

      return {
        fileId,
        type: REST_DOCUMENT_TYPE.SWAGGER,
        format: REST_FILE_FORMAT.JSON,
        data,
        source,
        errors,
        kind: FILE_KIND.TEXT,
      }
    }
  } else if (([REST_FILE_FORMAT.YAML, REST_FILE_FORMAT.YML] as string[]).includes(extension) || !extension) {
    if (/\s*?'?"?openapi'?"?\s*?:\s*?\|?\s*'?"?3\.[01]\..+?'?"?/g.test(sourceString)) {
      const data = loadYaml(sourceString) as OpenAPIV3.Document

      const type = data.openapi.startsWith('3.0') ? REST_DOCUMENT_TYPE.OAS3 : REST_DOCUMENT_TYPE.OAS31

      // validate openapi file
      const errors = validateDocument(type === REST_DOCUMENT_TYPE.OAS3 ? oas3 : oas31, data)

      return { fileId, type, format: REST_FILE_FORMAT.YAML, data, source, errors, kind: FILE_KIND.TEXT }
    }
    if (/\s*?'?"?swagger'?"?\s*?:\s*?\|?\s*'?"?2\..+?'?"?/g.test(sourceString)) {
      const data = loadYaml(sourceString) as OpenAPIV2.Document

      // validate swagger file
      const errors = validateDocument(swagger, data)

      return {
        fileId,
        type: REST_DOCUMENT_TYPE.SWAGGER,
        format: REST_FILE_FORMAT.YAML,
        data,
        source,
        errors,
        kind: FILE_KIND.TEXT,
      }
    }
  }
}

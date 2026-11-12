import { TEXT_DOCUMENT_TYPE, TEXT_FILE_FORMAT } from './text.consts'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'

export const parseTextFile = async (fileId: string, source: Blob): Promise<TextFile<string> | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === TEXT_FILE_FORMAT.MD) {
    return {
      fileId,
      type: TEXT_DOCUMENT_TYPE.MARKDOWN,
      format: TEXT_FILE_FORMAT.MD,
      data: sourceString,
      source,
      kind: FILE_KIND.TEXT,
    }
  }
}

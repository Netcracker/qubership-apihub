import type { FileFormat, MD_FILE_FORMAT, UNKNOWN_FILE_FORMAT } from '@apihub/entities/file-formats'
type ProhibitedFileFormat =
  | typeof MD_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT
export type OriginalDocumentFileFormat = Exclude<FileFormat, ProhibitedFileFormat>

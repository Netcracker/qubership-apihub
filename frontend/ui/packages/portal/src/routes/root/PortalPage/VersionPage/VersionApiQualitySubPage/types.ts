import type { FileFormat, MD_FILE_FORMAT, UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/entities/file-formats'
type ProhibitedFileFormat =
  | typeof MD_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT
export type OriginalDocumentFileFormat = Exclude<FileFormat, ProhibitedFileFormat>

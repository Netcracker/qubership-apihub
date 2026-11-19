import type { FileLabelsRecord } from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { includes } from '@netcracker/qubership-apihub-ui-shared/utils/filters'
import { sortBy } from 'lodash-es'

export function createFilesRecord(files: File[], filesWithLabels: FileLabelsRecord): FileLabelsRecord {
  return files.reduce(
    (acc, file) => ({
      ...acc,
      [file.name]: { file: file, labels: filesWithLabels[file.name]?.labels ?? [] },
    }), {} as FileLabelsRecord,
  )
}

export function sortFilesRecord(files: FileLabelsRecord, searchValue: string): FileLabelsRecord {
  const filesArray = Object.values(files)
    .filter(({ file: { name }, labels }) => includes([name], searchValue) || includes(labels, searchValue))
  const sortedArray = sortBy(filesArray, 'file.name')

  return sortedArray.reduce((acc, { file, labels }) => {
    acc[file.name] = { file, labels }
    return acc
  }, {} as FileLabelsRecord)
}

export function filesRecordToArray(record: FileLabelsRecord | undefined): File[] {
  if (!record) {
    return []
  }
  return Object.values(record).map(({ file }) => file)
}

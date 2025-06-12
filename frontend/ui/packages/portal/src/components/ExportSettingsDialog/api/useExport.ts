import type { Key } from '@apihub/entities/keys'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export enum ExportedEntityKind {
  VERSION = 'version',
  REST_DOCUMENT = 'restDocument',
  REST_OPERATIONS_GROUP = 'restOperationsGroup'
}

export enum ExportedFileFormat {
  HTML = 'html',
  YAML = 'yaml',
  JSON = 'json'
}

export enum ExportedEntityTransformation {
  REDUCED_SOURCE_SPECIFICATIONS = 'reducedSourceSpecifications',
  MERGED_SPECIFICATION = 'mergedSpecification'
}

export interface IRequestDataExport {
  exportedEntity: ExportedEntityKind
  packageId: PackageKey
  version: VersionKey
  format: ExportedFileFormat
  removeOasExtensions?: boolean
}

class CommonRequestDataExport implements IRequestDataExport {
  constructor(
    public readonly exportedEntity: ExportedEntityKind,
    public readonly packageId: PackageKey,
    public readonly version: VersionKey,
    public readonly format: ExportedFileFormat,
    public readonly removeOasExtensions: boolean = false,
  ) { }
}

export class RequestDataExportVersion extends CommonRequestDataExport {
  constructor(
    packageId: PackageKey,
    version: VersionKey,
    format: ExportedFileFormat,
    removeOasExtensions?: boolean,
  ) {
    super(ExportedEntityKind.VERSION, packageId, version, format, removeOasExtensions)
  }
}

export class RequestDataExportRestDocument extends CommonRequestDataExport {
  constructor(
    public readonly documentId: Key,
    packageId: PackageKey,
    version: VersionKey,
    format: ExportedFileFormat,
    removeOasExtensions?: boolean,
  ) {
    super(ExportedEntityKind.REST_DOCUMENT, packageId, version, format, removeOasExtensions)
  }
}

export class RequestDataExportRestOperationsGroup extends CommonRequestDataExport {
  constructor(
    public readonly groupName: string,
    public readonly operationsSpecTransformation: ExportedEntityTransformation,
    packageId: PackageKey,
    version: VersionKey,
    format: ExportedFileFormat,
    removeOasExtensions?: boolean,
  ) {
    super(ExportedEntityKind.REST_OPERATIONS_GROUP, packageId, version, format, removeOasExtensions)
  }
}

type ExportDto = Partial<{
  exportId: Key
}>

type Export = ExportDto

const QUERY_KEY_EXPORT = 'export'

export function useExport(requestData?: IRequestDataExport): [Export | undefined, IsLoading, Error | null] {
  const { data, isFetching, error } = useQuery<Export, Error | null, ExportDto>({
    queryKey: [QUERY_KEY_EXPORT, requestData?.exportedEntity, requestData?.packageId, requestData?.version],
    queryFn: () => startExport(requestData!),
    enabled: !!requestData,
  })

  return [data, isFetching, error]
}

function startExport(requestData: IRequestDataExport): Promise<ExportDto> {
  return requestJson<ExportDto>(
    '/export',
    {
      method: 'POST',
      body: JSON.stringify(requestData),
    },
    { basePath: API_V1 },
  )
}

type RemoveExportCallback = () => void

export function useRemoveExport(
  exportedEntity: ExportedEntityKind | undefined,
  packageId: PackageKey | undefined,
  version: VersionKey | undefined,
): RemoveExportCallback {
  const queryClient = useQueryClient()

  return () => {
    queryClient.removeQueries({ queryKey: [QUERY_KEY_EXPORT, exportedEntity, packageId, version] })
  }
}

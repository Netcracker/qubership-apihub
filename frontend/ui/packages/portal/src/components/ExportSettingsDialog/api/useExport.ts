import type { Key, PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'

export enum ExportedEntityKind {
  VERSION = 'version',
  SINGLE_DOCUMENT = 'restDocument',
  REST_OPERATIONS_GROUP = 'restOperationsGroup'
}

export enum ExportedEntityKindWithoutForm {
  GRAPHQL_OPERATIONS_GROUP = 'graphqlOperationsGroup'
}

export enum ExportedFileFormat {
  HTML = 'html',
  YAML = 'yaml',
  JSON = 'json'
}

export enum ExportedEntityTransformation {
  REDUCED_SOURCE_SPECIFICATIONS = 'reducedSourceSpecifications',
  MERGED_SPECIFICATION = 'mergedSpecification',
}

export interface IRequestDataExport {
  exportedEntity: ExportedEntityKind
  packageId: PackageKey
  version: VersionKey
  format: ExportedFileFormat
  removeOasExtensions?: boolean
  allowedShareabilityStatuses?: readonly ShareabilityStatus[]
}

class CommonRequestDataExport implements IRequestDataExport {
  constructor(
    public readonly exportedEntity: ExportedEntityKind,
    public readonly packageId: PackageKey,
    public readonly version: VersionKey,
    public readonly format: ExportedFileFormat,
    public readonly removeOasExtensions: boolean = false,
    public readonly allowedShareabilityStatuses?: readonly ShareabilityStatus[],
  ) { }
}

export class RequestDataExportVersion extends CommonRequestDataExport {

  constructor(
    packageId: PackageKey,
    version: VersionKey,
    format: ExportedFileFormat,
    removeOasExtensions?: boolean,
    allowedShareabilityStatuses?: readonly ShareabilityStatus[],
  ) {
    super(ExportedEntityKind.VERSION, packageId, version, format, removeOasExtensions, allowedShareabilityStatuses)
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
    super(ExportedEntityKind.SINGLE_DOCUMENT, packageId, version, format, removeOasExtensions)
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

export interface IRequestDataExportWithoutFormat {
  exportedEntity: ExportedEntityKindWithoutForm
  packageId: PackageKey
  version: VersionKey
  removeOasExtensions?: boolean
}

export class RequestDataExportGraphQlOperationsGroup implements IRequestDataExportWithoutFormat {
  constructor(
    public readonly groupName: string,
    public readonly exportedEntity: ExportedEntityKindWithoutForm,
    public readonly packageId: PackageKey,
    public readonly version: VersionKey,
  ) {
  }
}

type ExportDto = Partial<{
  exportId: Key
}>

type Export = ExportDto

const QUERY_KEY_EXPORT = 'export'

export function useExport(requestData?: IRequestDataExport | IRequestDataExportWithoutFormat): [Export | undefined, IsLoading, Error | null] {
  const { data, isFetching, error } = useQuery<Export, Error | null, ExportDto>({
    queryKey: [QUERY_KEY_EXPORT, requestData?.exportedEntity, requestData?.packageId, requestData?.version],
    queryFn: () => startExport(requestData!),
    enabled: !!requestData,
  })

  return [data, isFetching, error]
}

function startExport(requestData: IRequestDataExport | IRequestDataExportWithoutFormat): Promise<ExportDto> {
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

export function useRemoveExportResult(
  exportedEntity: ExportedEntityKind | ExportedEntityKindWithoutForm | undefined,
  packageId: PackageKey | undefined,
  version: VersionKey | undefined,
): RemoveExportCallback {
  const queryClient = useQueryClient()

  return () => {
    queryClient.removeQueries({ queryKey: [QUERY_KEY_EXPORT, exportedEntity, packageId, version] })
  }
}

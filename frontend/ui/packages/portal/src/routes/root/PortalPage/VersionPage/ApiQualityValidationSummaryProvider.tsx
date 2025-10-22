import { type ValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import { Link } from '@mui/material'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { FC, PropsWithChildren, ReactNode } from 'react'
import { createContext, memo, useContext } from 'react'
import { usePackageKind } from '@apihub/routes/root/PortalPage/usePackageKind'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

export const ClientValidationStatuses = {
  CHECKING: 'checking',
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  ERROR: 'error',
  NOT_VALIDATED: 'not-validated',
} as const
export type ClientValidationStatus = (typeof ClientValidationStatuses)[keyof typeof ClientValidationStatuses]

export type SetClientValidationStatus = (status: ClientValidationStatus | undefined) => void

// Raw contexts

export const ApiQualityLinterEnabledContext = createContext<boolean>(false)
export const ApiQualityValidationSummaryContext = createContext<ValidationSummary | undefined>(undefined)
export const ClientValidationStatusContext = createContext<ClientValidationStatus | undefined>(undefined)
export const SetClientValidationStatusContext = createContext<SetClientValidationStatus | undefined>(undefined)

type ApiQualityDataProviderProps = PropsWithChildren & {
  linterEnabled: boolean
  validationSummary: ValidationSummary | undefined
  clientValidationStatus: ClientValidationStatus | undefined
  setClientValidationStatus: SetClientValidationStatus
}

export function useApiQualityValidationSummary(): ValidationSummary | undefined {
  return useContext(ApiQualityValidationSummaryContext)
}

export function useApiQualityClientValidationStatus(): [ClientValidationStatus | undefined, SetClientValidationStatus | undefined] {
  return [
    useContext(ClientValidationStatusContext),
    useContext(SetClientValidationStatusContext),
  ]
}

const NOT_LINTED_API_TYPES: ApiType[] = [API_TYPE_GRAPHQL]

export function useApiQualityLinterEnabled(apiType?: ApiType): boolean {
  const [kind] = usePackageKind()
  const linterEnabled = (
    useContext(ApiQualityLinterEnabledContext) &&
    (!apiType || !NOT_LINTED_API_TYPES.some(notLintedApiType => notLintedApiType === apiType)) &&
    kind === PACKAGE_KIND
  )
  return linterEnabled
}

// High-order hooks

export type ApiQualityTabTooltip = string | undefined

export function useApiQualityTabTooltip(): ApiQualityTabTooltip {
  const [status] = useApiQualityClientValidationStatus()
  switch (status) {
    case ClientValidationStatuses.CHECKING:
      return 'Checking of API quality validation status is in progress'
    case ClientValidationStatuses.IN_PROGRESS:
      return 'API quality check is in progress'
    case ClientValidationStatuses.ERROR:
      return 'API quality check is failed'
    case ClientValidationStatuses.NOT_VALIDATED:
      return 'API quality is not validated'
  }
  return undefined
}

type CallbackRunLinter = () => void
type ApiQualitySummaryPlaceholder = string | ReactNode | undefined

export function getApiQualitySummaryPlaceholder(
  onManualRunLinter: CallbackRunLinter,
  status: ClientValidationStatus,
): ApiQualitySummaryPlaceholder {
  switch (status) {
    case ClientValidationStatuses.CHECKING:
      return 'Checking validation status...'
    case ClientValidationStatuses.IN_PROGRESS:
      return 'Validation is in progress, please wait...'
    case ClientValidationStatuses.NOT_VALIDATED:
      return <>
        No validation results.
        <br />
        <Link onClick={onManualRunLinter}>
          Run Validation
        </Link>
      </>
  }
  return undefined
}

// Public provider

export const ApiQualityDataProvider: FC<ApiQualityDataProviderProps> = memo((props) => {
  const {
    children,
    linterEnabled,
    validationSummary,
    clientValidationStatus,
    setClientValidationStatus,
  } = props
  return (
    <ApiQualityLinterEnabledContext.Provider value={linterEnabled}>
      <ClientValidationStatusContext.Provider value={clientValidationStatus}>
        <SetClientValidationStatusContext.Provider value={setClientValidationStatus}>
          <ApiQualityValidationSummaryContext.Provider value={validationSummary}>
            {children}
          </ApiQualityValidationSummaryContext.Provider>
        </SetClientValidationStatusContext.Provider>
      </ClientValidationStatusContext.Provider>
    </ApiQualityLinterEnabledContext.Provider>
  )
})

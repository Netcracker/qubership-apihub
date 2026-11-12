import { BackendBuildStatus, BuildStatus } from '../modules/builder/builder.constants'

export function toBackendBuildStatus(status: BuildStatus, async?: boolean): BackendBuildStatus {
  switch (status) {
    case BuildStatus.COMPLETE:
      return async ? BackendBuildStatus.RESULT_READY : BackendBuildStatus.COMPLETE
    case BuildStatus.ERROR:
      return BackendBuildStatus.ERROR
    case BuildStatus.RUNNING:
      return BackendBuildStatus.RUNNING
  }
}

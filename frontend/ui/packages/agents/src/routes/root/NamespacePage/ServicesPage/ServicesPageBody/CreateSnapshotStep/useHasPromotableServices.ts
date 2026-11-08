import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'

// The snapshot details list the services the snapshot published, and baselineFound marks the ones that have a
// baseline package
export function useHasPromotableServices(isSnapshotComplete: boolean): boolean {
  const { snapshotPublicationInfo: { services } } = useSnapshotPublicationInfo({ enabled: isSnapshotComplete })
  return services.some(({ baselineFound }) => baselineFound)
}

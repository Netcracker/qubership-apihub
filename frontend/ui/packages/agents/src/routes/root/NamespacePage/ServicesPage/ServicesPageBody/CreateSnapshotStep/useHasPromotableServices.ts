import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'

/**
 * Whether the published snapshot holds a service with a baseline package, which Promote Version needs. Fetches the
 * snapshot details only while `isSnapshotComplete` is true, and returns false while it has none.
 */
export function useHasPromotableServices(isSnapshotComplete: boolean): boolean {
  const { snapshotPublicationInfo: { services } } = useSnapshotPublicationInfo({ enabled: isSnapshotComplete })
  return services.some(({ baselineFound }) => baselineFound)
}

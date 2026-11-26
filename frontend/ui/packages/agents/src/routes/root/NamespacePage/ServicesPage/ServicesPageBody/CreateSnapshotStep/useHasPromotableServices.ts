import { useServices } from '../../../useServices'
import { useSnapshotPublications } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useSnapshotPublicationDetails } from '../useAllPublicationDetails'
import { hasPromotableService } from './snapshotPublications'

/**
 * Whether a service of the created snapshots was published and has a baseline package, which Promote Version needs.
 * The publication statuses and the discovered services hold both, so the check sends no request of its own.
 */
export function useHasPromotableServices(): boolean {
  const { snapshotPublications } = useSnapshotPublications()
  const allPublishDetails = useSnapshotPublicationDetails(snapshotPublications)
  const [{ services }] = useServices()

  return hasPromotableService(snapshotPublications, allPublishDetails, services)
}

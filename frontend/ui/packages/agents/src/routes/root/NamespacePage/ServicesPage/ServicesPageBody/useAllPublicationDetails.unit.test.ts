import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import { getCombinedPublishStatus } from './useAllPublicationDetails'

const PUBLISH_IDS = ['service-publication', 'snapshot-publication']

describe('getCombinedPublishStatus', () => {
  it('has no status without a config', () => {
    expect(getCombinedPublishStatus([], [])).toBe(NONE_PUBLISH_STATUS)
  })

  it('runs until the statuses of a started config arrive', () => {
    expect(getCombinedPublishStatus([], PUBLISH_IDS)).toBe(RUNNING_PUBLISH_STATUS)
    expect(
      getCombinedPublishStatus([{ publishId: 'service-publication', status: COMPLETE_PUBLISH_STATUS }], PUBLISH_IDS),
    )
      .toBe(RUNNING_PUBLISH_STATUS)
  })

  it('runs while a publication has not ended, also after another one failed', () => {
    expect(getCombinedPublishStatus([
      { publishId: 'service-publication', status: ERROR_PUBLISH_STATUS },
      { publishId: 'snapshot-publication', status: NONE_PUBLISH_STATUS },
    ], PUBLISH_IDS)).toBe(RUNNING_PUBLISH_STATUS)
  })

  it('fails when every publication ended and one failed', () => {
    expect(getCombinedPublishStatus([
      { publishId: 'service-publication', status: ERROR_PUBLISH_STATUS },
      { publishId: 'snapshot-publication', status: COMPLETE_PUBLISH_STATUS },
    ], PUBLISH_IDS)).toBe(ERROR_PUBLISH_STATUS)
  })

  it('completes when every publication completed', () => {
    expect(getCombinedPublishStatus([
      { publishId: 'service-publication', status: COMPLETE_PUBLISH_STATUS },
      { publishId: 'snapshot-publication', status: COMPLETE_PUBLISH_STATUS },
    ], PUBLISH_IDS)).toBe(COMPLETE_PUBLISH_STATUS)
  })
})

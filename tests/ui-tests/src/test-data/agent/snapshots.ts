import { NO_PREVIOUS_VERSION_OPTION } from '@agent/entities'
import { V_A_ANNOTUNCLAS, V_A_MULTI_CHANGES, V_A_NO_CHANGES, V_A_NON_BREAKING } from '@test-data/agent/versions'
import { TEST_SERVICE, TEST_SERVICE2 } from '@test-data/agent/other'

// For Snapshot step
export const SNAPSHOT_NO_BASELINE = {
  name: 'snp-no-baseline',
  services: [TEST_SERVICE],
  baseline: NO_PREVIOUS_VERSION_OPTION,
}
export const SNAPSHOT_NO_CHANGES = {
  name: 'snp-no-changes',
  baseline: V_A_NO_CHANGES.version,
  services: [TEST_SERVICE],
}

// For Validation step
export const SNAPSHOT_VLD_NO_BASELINE = {
  ...SNAPSHOT_NO_BASELINE,
  name: 'snp-vld-no-baseline',
}
export const SNAPSHOT_VLD_NO_CHANGES = {
  ...SNAPSHOT_NO_CHANGES,
  name: 'snp-vld-no-changes',
}
export const SNAPSHOT_VLD_NON_BRAKING = {
  name: 'snp-vld-non-breaking-changes',
  services: [TEST_SERVICE],
  baseline: V_A_NON_BREAKING.version,
}
export const SNAPSHOT_VLD_MULTI_CHANGES = {
  name: 'snp-vld-multi-changes',
  services: [TEST_SERVICE],
  baseline: V_A_MULTI_CHANGES.version,
}
export const SNAPSHOT_VLD_NO_CHANGES_ALL_SERVICES = {
  name: 'snp-vld-no-changes-all-services',
  baseline: V_A_NO_CHANGES.version,
  allServices: true,
}
export const SNAPSHOT_VLD_TWO_SERVICES = {
  name: 'snp-vld-two-services',
  services: [TEST_SERVICE, TEST_SERVICE2],
  baseline: NO_PREVIOUS_VERSION_OPTION,
}
export const SNAPSHOT_VLD_ANNOTUNCLAS_CHANGES = {
  name: 'snp-vld-annotunclas-changes',
  services: [TEST_SERVICE],
  baseline: V_A_ANNOTUNCLAS.version,
}

// For Promote step
export const SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES = {
  name: 'snp-prm-multi-changes-all-services',
  baseline: V_A_MULTI_CHANGES.version,
  allServices: true,
}
export const SNAPSHOT_PRM_NO_BASELINE = {
  ...SNAPSHOT_NO_BASELINE,
  name: 'snp-prm-no-baseline',
}
export const SNAPSHOT_PRM_TWO_SERVICES = {
  ...SNAPSHOT_VLD_TWO_SERVICES,
  name: 'snp-prm-two-services',
}

// For History tab
export const SNAPSHOT_HIS_MULTI_CHANGES = {
  ...SNAPSHOT_VLD_MULTI_CHANGES,
  name: 'snp-his-multi-changes',
}

// For full E2E
export const SNAPSHOT_E2E_NO_BASELINE = {
  ...SNAPSHOT_NO_BASELINE,
  name: 'snp-e2e-no-baseline',
}
export const SNAPSHOT_E2E_NO_BASELINE_SERVICE_2 = {
  name: 'snp-e2e-no-baseline-service2',
  services: [TEST_SERVICE2],
  baseline: NO_PREVIOUS_VERSION_OPTION,
}

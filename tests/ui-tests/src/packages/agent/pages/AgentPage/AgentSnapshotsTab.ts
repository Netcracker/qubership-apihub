import type { Page } from '@playwright/test'
import { Tab } from '@shared/components/base'
import { AgentSnapshotsServiceRow } from './SnapshotsTab/AgentSnapshotsServiceRow'
import { AgentSnapshotsSnapshotRow } from '@agent/pages/AgentPage/SnapshotsTab/AgentSnapshotsSnapshotRow'
import { nthPostfix } from '@services/utils'

export class AgentSnapshotsTab extends Tab {

  constructor(page: Page) {
    super(page.getByTestId('SnapshotsTabButton'), 'Snapshots')
  }

  getServiceRow(serviceName?: string, exact?: boolean): AgentSnapshotsServiceRow
  getServiceRow(nth?: number): AgentSnapshotsServiceRow
  getServiceRow(serviceName?: string, exact?: boolean, nth?: number): AgentSnapshotsServiceRow
  getServiceRow(serviceNameOrNth?: string | number, exact = true, nth?: number): AgentSnapshotsServiceRow {
    if (typeof serviceNameOrNth === 'string' && !nth) {
      return new AgentSnapshotsServiceRow(this.page.getByRole('cell', {
        name: serviceNameOrNth,
        exact: exact,
      }).locator('..'), serviceNameOrNth)
    }
    if (typeof serviceNameOrNth === 'number') {
      return new AgentSnapshotsServiceRow(this.page.getByTestId('Cell-snapshot-or-service').nth(serviceNameOrNth - 1).locator('..'), '', `${serviceNameOrNth}${nthPostfix(serviceNameOrNth)} service row`)
    }
    if (!serviceNameOrNth && !nth) {
      return new AgentSnapshotsServiceRow(this.page.getByTestId('Cell-snapshot-or-service').locator('..'))
    }
    if (serviceNameOrNth && nth) {
      return new AgentSnapshotsServiceRow(this.page.getByRole('cell', {
          name: serviceNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        serviceNameOrNth,
        `${nth}${nthPostfix(nth)} service row`)
    }
    throw new Error('Check arguments')
  }

  getSnapshotRow(serviceName?: string, exact?: boolean): AgentSnapshotsSnapshotRow
  getSnapshotRow(nth?: number): AgentSnapshotsSnapshotRow
  getSnapshotRow(serviceName?: string, exact?: boolean, nth?: number): AgentSnapshotsSnapshotRow
  getSnapshotRow(serviceNameOrNth?: string | number, exact = true, nth?: number): AgentSnapshotsSnapshotRow {
    if (typeof serviceNameOrNth === 'string' && !nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByRole('cell', {
        name: serviceNameOrNth,
        exact: exact,
      }).locator('..'), serviceNameOrNth)
    }
    if (typeof serviceNameOrNth === 'number') {
      return new AgentSnapshotsSnapshotRow(this.page.getByTestId('Cell-snapshot-or-service').nth(serviceNameOrNth - 1).locator('..'), '', `${serviceNameOrNth}${nthPostfix(serviceNameOrNth)} service row`)
    }
    if (!serviceNameOrNth && !nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByTestId('Cell-snapshot-or-service').locator('..'))
    }
    if (serviceNameOrNth && nth) {
      return new AgentSnapshotsSnapshotRow(this.page.getByRole('cell', {
          name: serviceNameOrNth,
          exact: exact,
        }).locator('..').nth(nth - 1),
        serviceNameOrNth,
        `${nth}${nthPostfix(nth)} service row`)
    }
    throw new Error('Check arguments')
  }
}

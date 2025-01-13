/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { type Page } from '@playwright/test'
import { Button, Tab, TabButton } from '@shared/components/base'
import { RunGatewayReportDialog } from './ReportsTab/RunGatewayReportDialog'
import { AgentReportRow } from './ReportsTab/AgentReportRow'

export class AgentReportsTab extends Tab {

  readonly authReportTabBtn = new TabButton(this.page.getByTestId('TabButton-authentication-report'), 'Authentication Check Report')
  readonly gatewayReportTabBtn = new TabButton(this.page.getByTestId('TabButton-routing-report'), 'Gateway Routing Report')
  readonly runReportBtn = new Button(this.page.getByTestId('RunReportButton'), 'Run Report')
  readonly runGatewayReportDialog = new RunGatewayReportDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('SecurityReportsTabButton'), 'Security Reports')
  }

  getReportRow(nth?: number): AgentReportRow {
    if (nth) {
      return new AgentReportRow(this.page.getByTestId('Cell-date').locator('..').nth(nth - 1))
    }
    return new AgentReportRow(this.page.getByTestId('Cell-date').locator('..'))
  }
}

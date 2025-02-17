import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'

export class PortalPageSidebar {

  private readonly locator = this.page.getByTestId('PortalSidebar')
  readonly favoritesBtn = new Button(this.locator.getByTestId('FavoritesButton'), 'Favorites')
  readonly sharedBtn = new Button(this.locator.getByTestId('SharedButton'), 'Shared')
  readonly privateBtn = new Button(this.locator.getByTestId('PrivateButton'), 'Private')
  readonly workspacesBtn = new Button(this.locator.getByTestId('WorkspacesButton'), 'Workspaces')

  constructor(private readonly page: Page) { }

  getWorkspaceButton(workspace: { packageId: string; name?: string }): Button {
    return new Button(this.locator.locator(`a[href="/portal/workspaces/${workspace.packageId}"]`), workspace.name || workspace.packageId, 'workspace button')
  }
}

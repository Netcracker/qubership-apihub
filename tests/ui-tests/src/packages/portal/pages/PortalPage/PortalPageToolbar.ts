import type { Page } from '@playwright/test'
import { Breadcrumbs, Button, SearchBar, Title } from '@shared/components/base'
import { CreatePackageMenu } from './CreatePackageMenu'

export class PortalPageToolbar {

  private readonly rootLocator = this.page.getByTestId('MainPageCardHeader')
  readonly breadcrumbs = new Breadcrumbs(this.rootLocator.getByTestId('PackageBreadcrumbs'), 'Group')
  readonly favoriteBtn = new Button(this.rootLocator.getByTestId('FavoriteButton'), 'Favorite')
  readonly title = new Title(this.rootLocator.getByTestId('MainPageCardTitle'), 'Toolbar')
  readonly titleText = new Title(this.rootLocator.getByTestId('ToolbarTitleTypography'), 'Toolbar')
  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchPackages'), 'Packages')
  readonly treeViewButton = new Button(this.rootLocator.getByTestId('TreeTableModeButton'), 'Tree View')
  readonly listViewButton = new Button(this.rootLocator.getByTestId('FlatTableModeButton'), 'List View')
  readonly settingsButton = new Button(this.rootLocator.getByTestId('PackageSettingsButton'), 'Package Settings')
  readonly createWorkspaceBtn = new Button(this.rootLocator.getByTestId('CreateWorkspaceButton'), 'Create Workspace')
  readonly createPackageMenu = new CreatePackageMenu(this.rootLocator)

  constructor(private readonly page: Page) { }
}

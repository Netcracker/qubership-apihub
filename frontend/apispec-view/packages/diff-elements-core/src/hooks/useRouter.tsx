import { Dictionary } from '@stoplight/types';
import * as React from 'react';
import { BrowserRouter, HashRouter, MemoryRouter, StaticRouter } from 'react-router-dom';

import { RouterType } from '../types';

/* React.ComponentType with no type argument is ComponentType<{}>, which under
   @types/react 18 accepts no children - React 17's types supplied them implicitly.
   These four are all router components whose whole purpose is to wrap children. */
const RouterComponent: Dictionary<React.ComponentType<React.PropsWithChildren>, RouterType> = {
  history: BrowserRouter,
  memory: MemoryRouter,
  hash: HashRouter,
  static: StaticRouter,
};

interface RouterProps {
  basename?: string;
  location?: string;
}

export const useRouter = (router: RouterType, basePath: string, staticRouterPath?: string) => {
  const Router = RouterComponent[router];
  const routerProps: RouterProps = {
    ...(router !== 'memory' && { basename: basePath }),
    ...(router === 'static' && { location: staticRouterPath }),
  };

  return {
    Router,
    routerProps,
  };
};

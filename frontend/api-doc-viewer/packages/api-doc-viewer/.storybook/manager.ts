import { addons } from '@storybook/manager-api';
import { STORY_RENDERED } from '@storybook/core-events';

// 1. Configure sidebar (Make root groups regular folders)
addons.setConfig({
  sidebar: {
    showRoots: false, // Without this, root folders cannot be collapsed
  },
});

// 2. Programmatic collapse after interface render
addons.register('collapse-sidebar-addon', (api) => {
  let isFirstRender = true;

  api.on(STORY_RENDERED, () => {
    if (isFirstRender) {
      // Timeout is necessary to wait for Storybook to finish
      // default expansion of the active folder.
      setTimeout(() => {
        if (typeof (api as any).collapseAll === 'function') {
          (api as any).collapseAll();
        }
      }, 100); // 100ms is usually enough for UI animations to complete

      isFirstRender = false;
    }
  });
});

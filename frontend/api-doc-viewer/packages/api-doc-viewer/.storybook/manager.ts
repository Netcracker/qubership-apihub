import { addons } from '@storybook/manager-api';
import { STORY_ARGS_UPDATED, STORY_RENDERED } from '@storybook/core-events';

const READONLY_SAMPLE_ARG_NAMES = new Set(['beforeYaml', 'afterYaml', 'sampleSql', 'caseId']);

const applyReadonlySampleControls = (): void => {
  for (const row of document.querySelectorAll('.docblock-argstable-body tr')) {
    const nameCell = row.querySelector('td:first-child span');
    const argName = nameCell?.textContent?.trim();
    if (!argName || !READONLY_SAMPLE_ARG_NAMES.has(argName)) {
      continue;
    }

    const textarea = row.querySelector('textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      continue;
    }

    textarea.readOnly = true;
    textarea.disabled = false;
    textarea.style.cursor = 'text';
  }
};

const scheduleReadonlySampleControls = (): void => {
  window.setTimeout(applyReadonlySampleControls, 0);
};

// 1. Configure sidebar (Make root groups regular folders)
addons.setConfig({
  sidebar: {
    showRoots: false, // Without this, root folders cannot be collapsed
  },
});

// Storybook 8.1 text controls use disabled (not readOnly) for table.readonly, which
// blocks copy. Patch sample reference args after controls render instead.
addons.register('readonly-sample-controls', (api) => {
  api.on(STORY_RENDERED, scheduleReadonlySampleControls);
  api.on(STORY_ARGS_UPDATED, scheduleReadonlySampleControls);
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

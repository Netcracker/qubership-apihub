import { addons } from '@storybook/addons';
import { STORY_ARGS_UPDATED, STORY_RENDERED } from '@storybook/core-events';
import { addons as managerAddons } from '@storybook/manager-api';
import customTheme from './theme';

const READONLY_SAMPLE_ARG_NAMES = new Set(['beforeYaml', 'afterYaml', 'sampleYaml']);

const applyReadonlySampleControls = () => {
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

const scheduleReadonlySampleControls = () => {
  window.setTimeout(applyReadonlySampleControls, 0);
};

addons.setConfig({
  theme: customTheme,
  panelPosition: 'right',
});

// Storybook text controls use disabled (not readOnly) for table.readonly, which
// blocks copy. Patch sample reference args after controls render instead.
managerAddons.register('readonly-sample-controls', (api) => {
  api.on(STORY_RENDERED, scheduleReadonlySampleControls);
  api.on(STORY_ARGS_UPDATED, scheduleReadonlySampleControls);
});

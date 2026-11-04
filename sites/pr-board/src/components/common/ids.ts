// Values several components share. They live apart from the components, so no component imports another one only
// for a constant, which made the header and the settings dialogs import each other in a circle.

// Focus goes back to the Settings button when a dialog closes and what opened it is gone (SET-18, SET-21).
export const SETTINGS_BUTTON_ID = 'settings-button';

// GitHub's page for a new fine-grained token (SET-18).
export const TOKEN_HELP_URL = 'https://github.com/settings/personal-access-tokens/new';

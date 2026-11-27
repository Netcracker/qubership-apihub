// Vite validates and injects repository and team defaults. No credential enters this configuration.

import { parseRepositories } from './repository.ts';
import type { BuildDefaults } from './build-defaults.ts';

declare const __PR_BOARD_REPO__: string;
declare const __PR_BOARD_DEFAULTS__: BuildDefaults;

export const BUILD_DEFAULTS = __PR_BOARD_DEFAULTS__;

export const REPOSITORIES = __PR_BOARD_REPO__ ? parseRepositories(__PR_BOARD_REPO__) : [];

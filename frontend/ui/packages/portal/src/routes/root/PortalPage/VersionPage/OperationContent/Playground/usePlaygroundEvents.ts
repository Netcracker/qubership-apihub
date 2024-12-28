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

import { useEvent } from 'react-use'
import { useEventBus } from '@apihub/routes/EventBusProvider'

const CREATE_CUSTOM_SERVICE_EVENT = 'createCustomService'
const OPEN_FULLSCREEN_EXAMPLES_POPUP_EVENT = 'openFullscreenExamplesPopup'

export function usePlaygroundEvents(): void {
  const { showCreateCustomServerDialog, showExamplesDialog } = useEventBus()

  useEvent(CREATE_CUSTOM_SERVICE_EVENT, () => showCreateCustomServerDialog())
  useEvent(OPEN_FULLSCREEN_EXAMPLES_POPUP_EVENT, () => showExamplesDialog())
}

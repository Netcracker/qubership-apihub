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

import { useBackwardLocation } from './root/useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from './BackwardLocationProvider'
import { useCallback } from 'react'

export function useDefaultBreadcrumbClickHandler(): () => void {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  return useCallback((): void => {
    setBackwardLocation({ ...backwardLocation, fromPackageSettings: location })
  }, [backwardLocation, location, setBackwardLocation])
}

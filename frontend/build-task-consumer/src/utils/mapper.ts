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

import { BackendBuildStatus, BuildStatus } from "src/modules/builder/builder.constants"

export function toBackendBuildStatus(status: BuildStatus, async?: boolean): BackendBuildStatus {
  switch (status) {
    case BuildStatus.COMPLETE:
      return async ? BackendBuildStatus.RESULT_READY : BackendBuildStatus.COMPLETE
    case BuildStatus.ERROR:
      return BackendBuildStatus.ERROR
    case BuildStatus.RUNNING:
      return BackendBuildStatus.RUNNING
  }
}

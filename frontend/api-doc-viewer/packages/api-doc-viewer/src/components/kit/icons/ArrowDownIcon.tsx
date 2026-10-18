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

import {FC, memo} from "react";

export const ArrowDownIcon: FC = memo(() => {
  return (
    <div style={{display: 'flex'}}>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9.12941 1.12467C9.39967 1.43857 9.3643 1.91212 9.0504 2.18239L5.48423 5.25283C5.20272 5.49521 4.7862 5.49499 4.50494 5.25233L0.946115 2.18189C0.632494 1.91131 0.597604 1.43771 0.868187 1.12409C1.13877 0.810473 1.61236 0.775583 1.92598 1.04617L4.99538 3.69435L8.07169 1.04567C8.38559 0.775404 8.85915 0.810777 9.12941 1.12467Z"
          fill="#626D82"/>
      </svg>
    </div>
  )
})

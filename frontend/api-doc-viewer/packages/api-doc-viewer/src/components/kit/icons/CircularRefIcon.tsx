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

export const CircularRefIcon: FC = memo(() => {
  return (
    <div className="flex" style={{marginTop: 2}}>
      <svg width="12" height="12" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3.91255 10.3791C2.10295 8.43354 2.13495 5.38394 4.01495 3.49034C4.78455 2.71514 5.74615 2.25274 6.74615 2.10154L6.69095 0.439941C5.28695 0.610341 3.92935 1.23674 2.85335 2.32074C0.334154 4.85674 0.303754 8.95194 2.75495 11.5455L1.36215 12.9471L5.77015 13.1879L5.75815 8.52074L3.91255 10.3791ZM9.23015 0.811942L9.24215 5.47914L11.0878 3.62154C12.8974 5.56874 12.8654 8.61834 10.9854 10.5103C10.2166 11.2855 9.25415 11.7479 8.25415 11.8991L8.30935 13.5599C9.71335 13.3895 11.071 12.7631 12.1478 11.6799C14.6662 9.14234 14.6966 5.04714 12.2454 2.45514L13.6382 1.05194L9.23015 0.811942Z"
          fill="#8F9EB4"/>
      </svg>
    </div>
  )
})

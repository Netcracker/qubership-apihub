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

import type { FC } from 'react'
import { memo } from 'react'

export const TreeIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3.99609 4.5C3.99609 3.11929 5.11538 2 6.49609 2C7.87681 2 8.99609 3.11929 8.99609 4.5C8.99609 5.61964 8.26007 6.56737 7.24547 6.88575L7.24547 7.50049C7.24695 8.18958 7.80603 8.74774 8.49547 8.74774H12.0681C12.3866 7.73346 13.3342 6.99774 14.4536 6.99774C15.8343 6.99774 16.9536 8.11703 16.9536 9.49774C16.9536 10.8785 15.8343 11.9977 14.4536 11.9977C13.3342 11.9977 12.3866 11.262 12.0681 10.2477H8.49547C8.04536 10.2477 7.6205 10.1396 7.24547 9.94789L7.24547 12.4978C7.24547 13.7404 8.25283 14.7478 9.49547 14.7478H12.1113C12.4305 13.7346 13.3775 13 14.4961 13C15.8768 13 16.9961 14.1193 16.9961 15.5C16.9961 16.8807 15.8768 18 14.4961 18C13.3759 18 12.4277 17.2632 12.1098 16.2478H9.49547C7.4244 16.2478 5.74547 14.5688 5.74547 12.4978L5.74547 7.50182C5.74547 7.50046 5.74547 7.49909 5.74547 7.49773L5.74547 6.88535C4.73151 6.56659 3.99609 5.61918 3.99609 4.5ZM6.49609 3.5C5.94381 3.5 5.49609 3.94772 5.49609 4.5C5.49609 5.05228 5.94381 5.5 6.49609 5.5C7.04838 5.5 7.49609 5.05228 7.49609 4.5C7.49609 3.94772 7.04838 3.5 6.49609 3.5ZM14.4536 8.49774C13.9013 8.49774 13.4536 8.94546 13.4536 9.49774C13.4536 10.05 13.9013 10.4977 14.4536 10.4977C15.0059 10.4977 15.4536 10.05 15.4536 9.49774C15.4536 8.94546 15.0059 8.49774 14.4536 8.49774ZM14.4961 14.5C13.9438 14.5 13.4961 14.9477 13.4961 15.5C13.4961 16.0523 13.9438 16.5 14.4961 16.5C15.0484 16.5 15.4961 16.0523 15.4961 15.5C15.4961 14.9477 15.0484 14.5 14.4961 14.5Z"
          fill="#353C4E"
        />
      </svg>
    </div>
  )
})

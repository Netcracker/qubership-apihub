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
import type { TogglerProps } from './Toggler'
import { Toggler } from './Toggler'
import {
  DOC_OPERATION_VIEW_MODE,
  INTROSPECTION_OPERATION_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
  SCHEMA_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
} from '../entities/operation-view-mode'

export const DOC_SPEC_VIEW_MODE = DOC_OPERATION_VIEW_MODE
export const SIMPLE_SPEC_VIEW_MODE = SIMPLE_OPERATION_VIEW_MODE
export const RAW_SPEC_VIEW_MODE = RAW_OPERATION_VIEW_MODE
export const SCHEMA_SPEC_VIEW_MODE = SCHEMA_OPERATION_VIEW_MODE
export const INTROSPECTION_SPEC_VIEW_MODE = INTROSPECTION_OPERATION_VIEW_MODE

export type SpecViewMode =
  | typeof DOC_SPEC_VIEW_MODE
  | typeof SIMPLE_SPEC_VIEW_MODE
  | typeof RAW_SPEC_VIEW_MODE
  | typeof SCHEMA_SPEC_VIEW_MODE
  | typeof INTROSPECTION_SPEC_VIEW_MODE

export type SpecViewTogglerProps = TogglerProps<SpecViewMode>

export const SpecViewToggler = Toggler as FC<SpecViewTogglerProps>

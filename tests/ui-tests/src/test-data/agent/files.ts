import { ROOT_RESOURCES, TestFile } from '@shared/entities'
import path from 'node:path'

const ROOT_AGENT = path.join(ROOT_RESOURCES, 'agent')

export const FILE_A_NO_CHANGES = new TestFile(path.join(ROOT_AGENT, 'atui_agent_petstore30_changed.yaml'))

export const FILE_A_MULTI_CHANGES = new TestFile(path.join(ROOT_AGENT, 'atui_agent_petstore30_base_multi_changes.yaml'))

export const FILE_A_NON_BREAKING = new TestFile(path.join(ROOT_AGENT, 'atui_agent_petstore30_base_non_breaking.yaml'))

export const FILE_A_ANNOTUNCLAS = new TestFile(path.join(ROOT_AGENT, 'atui_agent_petstore30_base_annotunclas.yaml'))

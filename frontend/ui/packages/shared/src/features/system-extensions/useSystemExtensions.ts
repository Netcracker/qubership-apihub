import { useMemo } from 'react'
import { useSystemConfiguration } from '../../hooks/authorization/useSystemConfiguration'
import type { SystemExtension } from '../../types/system-configuration'

// The names under which the backend registers its extensions (`extensions[].name` in its configuration).
export const SystemExtensionNames = {
  apiLinter: 'api-linter',
  agentsBackend: 'agents-backend',
  ncService: 'nc-service',
  docsBackend: 'docs-backend',
} as const

export type SystemExtensionName = typeof SystemExtensionNames[keyof typeof SystemExtensionNames]

export function useSystemExtensions(): SystemExtension[] {
  const [configuration] = useSystemConfiguration()

  return useMemo(() => configuration?.extensions ?? [], [configuration])
}

export function useLinterEnabled(): boolean {
  // Extension which is equal to "qubership-api-linter" has name defined in following file:
  // https://github.com/Netcracker/qubership-apihub/blob/linter/helm-templates/qubership-apihub/values.yaml#L210
  return useExtensionNameEnabled(SystemExtensionNames.apiLinter)
}

export function useAgentEnabled(): boolean {
  return useExtensionNameEnabled(SystemExtensionNames.agentsBackend)
}

export function useNcServiceEnabled(): boolean {
  return useExtensionNameEnabled(SystemExtensionNames.ncService)
}

export const DOCS_BACKEND_EXTENSION_NAME = SystemExtensionNames.docsBackend

export function useDocsBackendEnabled(): boolean {
  return useExtensionNameEnabled(DOCS_BACKEND_EXTENSION_NAME)
}

export function useGetDocsBackendPrefix(): string {
  const extensions = useSystemExtensions()
  const docsBackendEnabled = useDocsBackendEnabled()

  return useMemo(() => (docsBackendEnabled ? `/${findExtensions(extensions, DOCS_BACKEND_EXTENSION_NAME)?.pathPrefix}` : ''), [extensions, docsBackendEnabled])
}

export function useGetAgentPrefix(): string {
  const extensions = useSystemExtensions()
  const agentEnabled = useAgentEnabled()

  return useMemo(() => (agentEnabled ? `/${findExtensions(extensions, SystemExtensionNames.agentsBackend)?.pathPrefix}` : ''), [extensions, agentEnabled])
}

export function useGetNcServicePrefix(): string {
  const extensions = useSystemExtensions()
  const ncServiceEnabled = useNcServiceEnabled()

  return useMemo(() => (ncServiceEnabled ? `/${findExtensions(extensions, SystemExtensionNames.ncService)?.pathPrefix}` : ''), [extensions, ncServiceEnabled])
}

export function findExtensions(extensions: SystemExtension[], name: SystemExtensionName): SystemExtension | undefined {
  return extensions.find(extension => extension.name === name)
}

function useExtensionNameEnabled(name: SystemExtensionName): boolean {
  const extensions = useSystemExtensions()
  return useMemo(() => extensions.some(extension => extension.name === name), [extensions, name])
}

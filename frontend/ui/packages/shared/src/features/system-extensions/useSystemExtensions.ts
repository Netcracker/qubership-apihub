import { useMemo } from 'react'
import { useSystemConfiguration } from '../../hooks/authorization/useSystemConfiguration'
import type { SystemExtension } from '../../types/system-configuration'

function useSystemExtensions(): SystemExtension[] {
  const [configuration] = useSystemConfiguration()

  return useMemo(() => configuration?.extensions ?? [], [configuration])
}

export function useLinterEnabled(): boolean {
  // Extension which is equal to "qubership-api-linter" has name defined in following file:
  // https://github.com/Netcracker/qubership-apihub/blob/linter/helm-templates/qubership-apihub/values.yaml#L210
  return useExtensionNameEnabled('api-linter')
}

export function useAgentEnabled(): boolean {
  return useExtensionNameEnabled('agents-backend')
}

export function useNcServiceEnabled(): boolean {
  return useExtensionNameEnabled('nc-service')
}

export function useGetAgentPrefix(): string {
  const extensions = useSystemExtensions()
  const agentEnabled = useAgentEnabled()

  return useMemo(() => (agentEnabled ? `/${findExtensions(extensions, 'agents-backend')?.pathPrefix}` : ''), [extensions, agentEnabled])
}

export function useGetNcServicePrefix(): string {
  const extensions = useSystemExtensions()
  const ncServiceEnabled = useNcServiceEnabled()

  return useMemo(() => (ncServiceEnabled ? `/${findExtensions(extensions, 'nc-service')?.pathPrefix}` : ''), [extensions, ncServiceEnabled])
}

export function findExtensions(extensions: SystemExtension[], name: string): SystemExtension | undefined {
  return extensions.find(extension => extension.name === name)
}

function useExtensionNameEnabled(name: string): boolean {
  const extensions = useSystemExtensions()
  return useMemo(() => extensions.some(extension => extension.name === name), [extensions, name])
}

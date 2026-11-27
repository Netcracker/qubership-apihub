import type { RepoGroup } from './board/groups.ts';

export const SERVICE_ACCOUNT = 'NetcrackerCLPLCI';

export const OFFICIAL_REPO_GROUPS: RepoGroup[] = [
  { name: 'Archived', repos: [
    'Netcracker/qubership-apihub-sniffer-agent', 'Netcracker/qubership-apihub-traffic-analyzer',
  ] },
  { name: 'Old polyrepos', repos: [
    'Netcracker/qubership-apihub-backend', 'Netcracker/qubership-apihub-ui',
    'Netcracker/qubership-apihub-postman-collections', 'Netcracker/qubership-api-linter-service',
    'Netcracker/qubership-apihub-agents-backend', 'Netcracker/qubership-apihub-api-diff',
    'Netcracker/qubership-apihub-compatibility-suites', 'Netcracker/qubership-apihub-api-doc-viewer',
    'Netcracker/qubership-apihub-api-unifier', 'Netcracker/qubership-apihub-api-processor',
  ] },
  { name: 'Monorepo & Co', isDefault: true, repos: [
    'Netcracker/qubership-apihub', 'Netcracker/qubership-apihub-ci',
    'Netcracker/qubership-apihub-vscode', 'Netcracker/qubership-apihub-aux-tools',
  ] },
];

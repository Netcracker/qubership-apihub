import type { SecurityReports } from '../../components/SecurityReportsTable'

export const longNameTableData: SecurityReports = Array.from({ length: 30 }, (_, index) => ({
  processId: `long-process-name-number-${index}`,
  createdAt: '2021-09-01T12:00:00Z',
  createdBy: {
    type: 'user',
    id: `id-${index + 1}`,
    avatarUrl: 'https://via.placeholder.com/150',
    name: `VeryVeryVeryVeryVeryVeryLongUserNameThatExceedsTheUsualLength ${index}`,
  },
  status: 'complete',
  errorMessage: undefined,
  servicesProcessed: 200000000 + index,
  servicesTotal: 10000000 + index,
}))

export const fullTableData: SecurityReports = Array.from({ length: 20 }, (_, index) => ({
  processId: `process${index + Math.random() * 100}`,
  createdAt: '2021-09-01T12:00:00Z',
  createdBy: {
    type: 'user',
    id: `id-${index + Math.random() * 10}`,
    avatarUrl: 'https://via.placeholder.com/150',
    name: `User ${index + +Math.round(Math.random() * 100)}`,
  },
  status: index % 2 === 0 ? 'complete' : 'error',
  errorMessage: index % 2 === 0 ? undefined : 'Error occurred',
  servicesProcessed: index * 5,
  servicesTotal: 500,
}))

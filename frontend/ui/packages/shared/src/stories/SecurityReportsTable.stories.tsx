import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import type { SecurityReportsTableProps } from '../components/SecurityReportsTable'
import { SecurityReportsTable } from '../components/SecurityReportsTable'
import { fullTableData, longNameTableData } from './samples/table-samples'
import { isEmpty } from '../utils/arrays'

const meta: Meta<SecurityReportsTableProps> = {
  title: 'Security Reports Table',
  component: SecurityReportsTable,
}

export default meta
type Story = StoryObj<typeof meta>

export const EmptyStory: Story = {
  name: 'Empty Data',
  args: {
    data: [],
    downloadSecurityReport: () => console.log('Mock download function executed'),
    fetchNextPage: () => Promise.resolve(0),
    isFetchingNextPage: false,
    hasNextPage: false,
    isLoading: false,
  },
}

export const LongDataNamesStory: Story = {
  name: 'Long Data Names',
  args: {
    data: longNameTableData,
    downloadSecurityReport: () => console.log('Mock download function executed'),
    fetchNextPage: () => Promise.resolve(0),
    isFetchingNextPage: false,
    hasNextPage: false,
    isLoading: false,
    downloadOptions: [
      { value: 'download-report', text: 'Download Option 1' },
      { value: 'download-report', text: 'Download Option 2' },
    ],
  },
}

export const InfinityDataStory: Story = {
  name: 'Infinity Data',
  args: {
    data: fullTableData,
    downloadSecurityReport: () => console.log('Mock download function executed'),
    isFetchingNextPage: false,
    hasNextPage: true,
    isLoading: false,
  },
  render: function Render(args) {
    const [{ data }, updateArgs] = useArgs()

    function onFetchNextPage(): Promise<number> {
      updateArgs({ data: isEmpty(data) ? fullTableData : [...data, ...fullTableData] })
      return Promise.resolve(1)
    }

    return <SecurityReportsTable {...args} fetchNextPage={onFetchNextPage} data={data}/>
  },
}

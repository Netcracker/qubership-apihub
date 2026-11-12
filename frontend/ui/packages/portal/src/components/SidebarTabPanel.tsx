import type { FC } from 'react'
import { memo } from 'react'
import { TabPanel } from '@mui/lab'
import type { SidebarPanelProps } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'

export type SidebarTabPanelProps = SidebarPanelProps & {
  value: string
}

export const SidebarTabPanel: FC<SidebarTabPanelProps> = memo<SidebarTabPanelProps>(({ value, header, body }) => {
  return (
    <TabPanel value={value}>
      <SidebarPanel
        header={header}
        body={body}
      />
    </TabPanel>
  )
})

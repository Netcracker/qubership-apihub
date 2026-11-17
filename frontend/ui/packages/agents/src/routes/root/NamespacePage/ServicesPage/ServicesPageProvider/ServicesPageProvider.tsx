import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import { DiscoveryStartViewProvider } from './DiscoveryStartViewProvider'
import { ServicesStepsProvider } from './ServicesStepsProvider'
import { ServicesPublicationOptionsProvider } from './ServicesPublicationOptionsProvider'

export const ServicesPageProvider: FC<PropsWithChildren> = memo(({ children }) => {
  return (
    <ServicesStepsProvider>
      <DiscoveryStartViewProvider>
        <ServicesPublicationOptionsProvider>
          {children}
        </ServicesPublicationOptionsProvider>
      </DiscoveryStartViewProvider>
    </ServicesStepsProvider>
  )
})

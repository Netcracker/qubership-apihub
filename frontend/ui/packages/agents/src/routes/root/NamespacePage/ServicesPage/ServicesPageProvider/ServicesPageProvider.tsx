import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import { ServicesStepsProvider } from './ServicesStepsProvider'
import { ServicesPublicationOptionsProvider } from './ServicesPublicationOptionsProvider'

export const ServicesPageProvider: FC<PropsWithChildren> = memo(({ children }) => {
  return (
    <ServicesStepsProvider>
      <ServicesPublicationOptionsProvider>
        {children}
      </ServicesPublicationOptionsProvider>
    </ServicesStepsProvider>
  )
})

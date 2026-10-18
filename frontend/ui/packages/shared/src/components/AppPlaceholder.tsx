import { memo, type FC } from 'react'

export const AppPlaceholder: FC = memo(() => {
  return (
    <div style={{ padding: 20, fontSize: 14 }}>
      Please, wait...
    </div>
  )
})

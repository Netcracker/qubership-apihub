import { useParams } from 'react-router-dom'

// We use '*' as path param for VersionPage routing, it helps to understand which subpage need to be render
export function useActiveTabs(): string[] {
  const { '*': pathParams = '' } = useParams()
  const [menuItem, sidebarItem] = pathParams.split('/')

  return [
    menuItem,
    sidebarItem,
  ]
}

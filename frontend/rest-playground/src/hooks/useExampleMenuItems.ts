import type { INodeExample, INodeExternalExample } from '@stoplight/types'
import { useCallback, useMemo } from 'react'

export type ExampleMenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  example: INodeExample | INodeExternalExample;
};

export const useExampleMenuItems = (examples: ReadonlyArray<INodeExample | INodeExternalExample>) => {
  const menuItems = useMemo<ExampleMenuItem[]>(
    () =>
      examples.map((example, index) => ({
        id: `request-example-${index}-${example.key}`,
        title: example.key,
        subtitle: example.summary,
        example,
      })),
    [examples],
  )

  const findMenuItem = useCallback(
    (id: string | undefined) => menuItems.find(item => item.id === id),
    [menuItems],
  )

  const renderMenuItemTitle = useCallback((id: string) => findMenuItem(id)?.title ?? '', [findMenuItem])

  return { menuItems, findMenuItem, renderMenuItemTitle }
}

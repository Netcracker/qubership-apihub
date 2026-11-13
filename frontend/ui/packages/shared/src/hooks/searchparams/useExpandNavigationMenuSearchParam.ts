import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'

import { useSearchParam } from './useSearchParam'
import { EXPAND_NAVIGATION_MENU_SEARCH_PARAM } from '../../utils/search-params'

export const EXPAND_NAVIGATION_MENU = 'expand'

export function useExpandNavigationMenuSearchParam(): [boolean, SetExpandNavigationMenu] {
  const expand = useSearchParam(EXPAND_NAVIGATION_MENU_SEARCH_PARAM)

  const [searchParams] = useSearchParams()
  const [hashParam] = useHash()
  const navigate = useNavigate()

  return [
    !!expand,
    useCallback(expand => {
      if (expand) {
        searchParams.set(EXPAND_NAVIGATION_MENU_SEARCH_PARAM, EXPAND_NAVIGATION_MENU)
      } else {
        searchParams.delete(EXPAND_NAVIGATION_MENU_SEARCH_PARAM)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetExpandNavigationMenu = (value: boolean) => void

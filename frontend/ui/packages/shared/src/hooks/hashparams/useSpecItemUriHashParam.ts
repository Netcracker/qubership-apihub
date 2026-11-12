import { useHash } from 'react-use'
import { isSpecItemUri, type SpecItemUri } from '../../utils/specifications'

export function useSpecItemUriHashParam(): [SpecItemUri, SetSpecItemUri] {
  const [hashParam, setHashParam] = useHash()
  const handledHashParam = hashParam.replace('#', '')

  return [
    isSpecItemUri(handledHashParam) ? handledHashParam : '/',
    (value: SpecItemUri) => setHashParam(`#${value}`),
  ]
}

type SetSpecItemUri = (value: SpecItemUri) => void

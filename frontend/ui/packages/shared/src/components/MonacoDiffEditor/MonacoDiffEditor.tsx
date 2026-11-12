import type { FC } from 'react'
import { lazy, memo, Suspense } from 'react'
import type { MonacoDiffEditorElementProps } from './MonacoDiffEditorElement'
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'
import { LoadingIndicator } from '../LoadingIndicator'

export type MonacoDiffEditorProps = {
  before: string
  after: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = lazy(() => import('./MonacoDiffEditorElement'))

export const MonacoDiffEditor: FC<MonacoDiffEditorProps> = memo<MonacoDiffEditorProps>(({
  before,
  after,
  type,
  language,
  selectedUri,
}) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <MonacoDiffEditorElement
        before={before}
        after={after}
        type={type}
        language={language}
        selectedUri={selectedUri}
      />
    </Suspense>
  )
})

import React, { FC, memo } from 'react'
import { Typography } from '@mui/material'
import { Editor } from '@monaco-editor/react'

export type ExampleViewerProps = {
  example: string;
};

export const ExampleViewer: FC<ExampleViewerProps> = memo<ExampleViewerProps>(({ example }) => {
  if (!example) {
    return (
      <Typography variant="inherit" sx={PLACEHOLDER_TEXT_STYLE}>
        Example not available
      </Typography>
    )
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      value={example}
      options={{
        readOnly: true,
        cursorStyle: 'line',
        wordWrap: true,
        minimap: { enabled: false },
        hideCursorInOverviewRuler: true,
        overviewRulerLanes: 0,
        lineNumbersMinChars: 2,
        alwaysConsumeMouseWheel: false,
        scrollBeyondLastLine: false,
      }}
      onMount={(editor, monaco) => {
        setTimeout(() => {
          editor.getAction('editor.action.formatDocument').run()
        }, 300)
      }}
    />
  )
})

const PLACEHOLDER_TEXT_STYLE = { textAlign: 'center', marginTop: '30%' }

import { editor as Editor } from 'monaco-editor'

export function navigateTo(
  editor: Editor.IStandaloneCodeEditor,
  lineNumber: number,
): void {
  editor.revealLineNearTop(lineNumber, Editor.ScrollType.Smooth)
  editor.setPosition({ lineNumber: lineNumber, column: 0 })
  editor.focus()
}

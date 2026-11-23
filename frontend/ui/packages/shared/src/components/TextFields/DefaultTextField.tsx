import { forwardRef } from 'react'

import { BaseTextField, type BaseTextFieldProps, DEFAULT_TEXT_FIELD_APPEARANCE } from './BaseTextField'

/**
 * The default text field of the design library: a grey field that shows a border on hover, in focus, and with an
 * error. The sizes and the label are those of {@link BaseTextField}.
 */
export const DefaultTextField = forwardRef<HTMLDivElement, BaseTextFieldProps>((props, ref) => (
  <BaseTextField {...props} ref={ref} appearance={DEFAULT_TEXT_FIELD_APPEARANCE} />
))

DefaultTextField.displayName = 'DefaultTextField'

import { forwardRef } from 'react'

import { BaseTextField, type BaseTextFieldProps } from './BaseTextField'

/**
 * The outlined text field of the design library: a white field with a grey border, which turns darker on hover,
 * blue in focus, and red with an error. The sizes and the label are those of {@link BaseTextField}.
 */
export const OutlinedTextField = forwardRef<HTMLDivElement, BaseTextFieldProps>((props, ref) => (
  <BaseTextField {...props} ref={ref} appearance="outlined" />
))

OutlinedTextField.displayName = 'OutlinedTextField'

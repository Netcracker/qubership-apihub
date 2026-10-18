import { useCallback } from 'react'
import { type Control, useForm, type UseFormHandleSubmit, type UseFormSetValue } from 'react-hook-form'
import {
  OAS_EXTENSION_KIND_DIRECT,
  OAS_EXTENSION_KIND_INHERITED,
  OAS_EXTENSION_KIND_MIXED,
  OAS_EXTENSION_PREFIX,
  type OasSettingsExtension,
  separateExtensionsByInheritance,
} from '../package-export-config'
import { isEmpty, sortByProperty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type EditOasExtensionsForm = {
  oasExtensions: OasSettingsExtension[] | undefined
}

type OasExtensionsManagerResult = {
  control: Control<EditOasExtensionsForm>
  handleSubmit: UseFormHandleSubmit<EditOasExtensionsForm>
  setValue: UseFormSetValue<EditOasExtensionsForm>
  processExtensionsUpdate: (newExtensions: Array<string | OasSettingsExtension>, currentExtensions?: OasSettingsExtension[]) => OasSettingsExtension[]
}

/**
 * Custom hook for managing OpenAPI Specification (OAS) extensions
 * within a form context, specifically integrating with `react-hook-form`.
 *
 * It handles the initialization of extensions, converts string inputs into structured `OasExtension` objects,
 * manages the deletion of extensions while considering their inheritance kind (`direct`, `inherited`, `mixed`),
 * processes updates to the extension list, and ensures consistent sorting based on inheritance.
 *
 * @param initialExtensions - Optional array of initial OAS extensions to populate the form.
 * @returns An object containing `react-hook-form` control elements (`control`, `handleSubmit`, `setValue`)
 *          and a `processExtensionsUpdate` function to handle changes to the extensions list.
 **/
export const useOasExtensionsManager = (initialExtensions?: OasSettingsExtension[]): OasExtensionsManagerResult => {
  const { control, handleSubmit, setValue } = useForm<EditOasExtensionsForm>({
    defaultValues: {
      oasExtensions: initialExtensions,
    },
  })

  /**
   * Converts a string extension key to an OasExtension object
   */
  const convertToExtension = useCallback((item: string | OasSettingsExtension): OasSettingsExtension => {
    if (typeof item === 'string') {
      return {
        key: item,
        name: OAS_EXTENSION_PREFIX + item,
        kind: OAS_EXTENSION_KIND_DIRECT,
      }
    }
    return item
  }, [])

  /**
   * Handles inheritance for deleted extensions (keeps inherited/mixed ones and updates their kind)
   */
  const handleDeletedExtensions = useCallback((
    newExtensions: OasSettingsExtension[],
    currentExtensions: OasSettingsExtension[],
  ): OasSettingsExtension[] => {

    // Track new extension keys for fast lookup
    const newExtensionKeys = new Set(newExtensions.map(ext => ext.key))
    return currentExtensions
      .filter(ext => {
        const isDeleted = !newExtensionKeys.has(ext.key)
        return isDeleted && (ext.kind === OAS_EXTENSION_KIND_MIXED || ext.kind === OAS_EXTENSION_KIND_INHERITED)
      })
      .map(ext => ({
        ...ext,
        kind: OAS_EXTENSION_KIND_INHERITED,
      }))
  }, [])

  /**
   * Processes extension updates, handling additions, deletions and inheritance
   */
  const processExtensionsUpdate = useCallback((
    newExtensions: Array<string | OasSettingsExtension>,
    currentExtensions: OasSettingsExtension[] = [],
  ): OasSettingsExtension[] => {
    // Convert all extensions to uniform OasExtension objects
    const newConvertedExtensions = newExtensions.map(convertToExtension)

    // Early return if no current extensions to compare against
    if (isEmpty(currentExtensions)) {
      return newConvertedExtensions
    }

    // Handle deleted extensions that were inherited or mixed
    const preservedExtensions = handleDeletedExtensions(newConvertedExtensions, currentExtensions)

    // Combine and sort the final list
    const finalExtensions = [...newConvertedExtensions, ...preservedExtensions]
    const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(finalExtensions)

    return [
      ...sortByProperty(inheritedExtensions, 'name'),
      ...nonInheritedExtensions,
    ]
  }, [convertToExtension, handleDeletedExtensions])

  return {
    control,
    handleSubmit,
    setValue,
    processExtensionsUpdate,
  }
}

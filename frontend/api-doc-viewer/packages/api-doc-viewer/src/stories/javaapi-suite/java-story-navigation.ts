import { JavaApiNavigationLinkBuilder } from '@netcracker/qubership-apihub-next-data-model/shared/javaapi/types/navigation-link-builder'

/** In-page anchor for type reference links in Java stories (hosts navigate to their own routes). */
export const javaStoryNavigationLinkBuilder: JavaApiNavigationLinkBuilder = className => `#${className}`

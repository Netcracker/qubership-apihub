import type { LibraryVersion } from '@portal/entities/libraries'

type LibraryActivities = NonNullable<NonNullable<LibraryVersion['metadata']>['activities']>

export function filterLibraryActivities(activities: LibraryActivities, search: string): LibraryActivities {
  const text = search.toLowerCase()
  return activities.filter(activity => {
    return [activity.action, activity.createdBy].some(value => value.toLowerCase().includes(text))
  })
}

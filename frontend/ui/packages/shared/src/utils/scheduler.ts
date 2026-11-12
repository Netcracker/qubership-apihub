export function scheduleInBackground<T>(task: () => T): Promise<T> {
  if (!self.scheduler) {
    return Promise.resolve(task())
  }
  return self.scheduler.postTask(task, { priority: 'background' })
}

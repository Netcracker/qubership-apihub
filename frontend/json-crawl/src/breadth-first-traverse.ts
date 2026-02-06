import { getNodeRules, mergeRules } from "./rules";
import { CrawlContext, CrawlParams, CrawlRules, Runnable, SyncCrawlHook } from "./types";
import { isArray, isObject } from "./utils";

export function breadthFirstTraverse<T extends {}, R extends {} = {}>(
  source: unknown,
  hooks: SyncCrawlHook<T, R> | SyncCrawlHook<T, R>[],
  params: CrawlParams<T, R> = {},
): void {
  // Early return for falsy values or non-objects
  if (!source || !isObject(source)) {
    return;
  }

  hooks = isArray(hooks) ? hooks : [hooks]
  const _rules = isArray(params.rules) ? mergeRules(params.rules) : params.rules

  // Queue for breadth-first traversal
  interface QueueItem {
    value: unknown;
    path: PropertyKey[];
    key: PropertyKey | undefined;
    rules: CrawlRules<R>;
  }

  const queue: QueueItem[] = [{ value: source, path: [], key: undefined, rules: _rules! }];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const {
      value: currentValue,
      path: currentPath,
      key: currentKey,
      rules: currentRules,
    } = queue[queueIndex++];

    let context: CrawlContext<T, R> | null = {
      value: currentValue,
      path: currentPath,
      key: currentKey as PropertyKey,
      state: {} as T,
      rules: currentKey !== undefined
        ? getNodeRules(currentRules, currentKey, currentPath, currentValue)
        : _rules
    }
    const afterHooksHooks: Runnable[] = []
    const exitHooks: Runnable[] = []

    // Apply all hooks to current node
    for (const hook of hooks) {
      if (!hook || typeof hook !== 'function') { continue }

      const {
        terminate,
        done,
        exitHook,
        afterHooksHook,
        ...rest
      } = hook(context) ?? {};

      if (terminate) {
        return;
      }

      exitHook && exitHooks.push(exitHook)
      afterHooksHook && afterHooksHooks.push(afterHooksHook)

      if (done) {
        context = null
        break
      }
      context = { ...context, ...rest }
    }
    while (afterHooksHooks.length) { afterHooksHooks.pop()!() }

    // If current value is an object, add its children to the queue
    if (context && isObject(context.value)) {
      const keys = Array.isArray(context.value)
        ? Array.from(context.value.keys())
        : Reflect.ownKeys(context.value);

      for (const key of keys) {
        const value = context.value[key];
        queue.push({
          value,
          path: [...currentPath, key],
          key,
          rules: context.rules!, // TODO 25.09.25 // Handle undefined rules
        });
      }
    } else {
      while (exitHooks.length) { exitHooks.pop()!() }
    }
  }
}
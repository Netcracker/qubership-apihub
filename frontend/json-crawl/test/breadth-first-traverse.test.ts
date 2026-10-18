import { CrawlContext } from "../src/types"
import { breadthFirstTraverse } from "../src/breadth-first-traverse"

describe('Breadth-first traverse test', () => {
  // The example object is shared by every case below. Its shape is the point: two branches
  // of differing depth (`c` an array, `d` an object) plus leaves of several types, so a
  // depth-first walk and a breadth-first walk visit it in demonstrably different orders.
  const example = {
    a: 1234,
    b: 'test',
    c: [1, 2, 3],
    d: {
      e: 4567,
      f: 'test2',
    },
    g: null,
    h: Symbol('test'),
    i: true,
  }

  const visitedPaths = (source: unknown): PropertyKey[][] => {
    const paths: PropertyKey[][] = []
    breadthFirstTraverse(source, ({ path }: CrawlContext<any, any>) => { paths.push(path) })
    return paths
  }

  // This is the assertion the suite was missing. Until it existed the only case here was an
  // `it('example')` that ran the traversal and asserted NOTHING — it could not fail unless
  // the function threw, so it held for a traversal in any order, or for one that visited
  // nothing at all.
  it('visits every node breadth-first', () => {
    expect(visitedPaths(example)).toEqual([
      [],
      ['a'], ['b'], ['c'], ['d'], ['g'], ['h'], ['i'],
      ['c', 0], ['c', 1], ['c', 2],
      ['d', 'e'], ['d', 'f'],
    ])
  })

  it('visits every depth-1 node before any depth-2 node', () => {
    // The property the name promises, stated independently of the exact key order above so
    // that a change in key ordering does not silently weaken this into a tautology.
    const depths = visitedPaths(example).map((p) => p.length)
    expect(depths).toEqual([...depths].sort((x, y) => x - y))
  })

  it('runs every hook against every node', () => {
    const seen: number[] = [0, 0]
    breadthFirstTraverse(example, [() => { seen[0]++ }, () => { seen[1]++ }])
    expect(seen[0]).toEqual(13)
    expect(seen[1]).toEqual(13)
  })

  it('terminate stops the walk', () => {
    const paths: PropertyKey[][] = []
    breadthFirstTraverse(example, ({ path }: CrawlContext<any, any>) => {
      paths.push(path)
      return path.length ? { terminate: true } : undefined
    })
    expect(paths).toEqual([[], ['a']])
  })

  it('non-objects are not traversed', () => {
    expect(visitedPaths(null)).toEqual([])
    expect(visitedPaths(undefined)).toEqual([])
    expect(visitedPaths(42)).toEqual([])
    expect(visitedPaths('test')).toEqual([])
  })
})

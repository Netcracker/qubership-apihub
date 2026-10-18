import { TEST_INLINE_REFS_FLAG, TEST_SYNTHETIC_ALL_OF_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './../helpers/index'
import { normalize } from "../../src"
import { commonOriginsCheck, graphapi, TEST_ORIGINS_FLAG } from "../helpers"

describe('origins in graphapi', () => {

  it('origins', () => {
    const graphApi = graphapi`
      type Query {
        rpc(arg: [Shared]): Shared
      }

      interface One {
       prp(arg: Cycled, en: [Shared] = [V]): Cycled
      }
      
      interface Two {
       prp: [Cycled]
      }
      
      interface Complex implements One & Two {
        prp: Cycled!
      }
      
      extend interface Two {
        anotherPrp: Cycled
      }
      
      enum Shared {
        V
      }
      
      union Cycled = Shared | Complex  | One | Two | Scalar
      
      scalar Scalar @specifiedBy(url:"http://ya.ru")
    `
    const result = normalize(graphApi, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { originsFlag: TEST_ORIGINS_FLAG })
  })

  it('resolve refs', () => {
    const graphApi = graphapi`
      type Query {
        rpc(arg: [Shared]): Shared
      }
      
      scalar Shared @specifiedBy(url:"http://ya.ru")
    `
    const result = normalize(graphApi, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })
    expect(result).toHaveProperty(["queries", "rpc", "output", "typeDef", TEST_INLINE_REFS_FLAG], ["#/components/scalars/Shared"])
    expect(result).toHaveProperty(["queries", "rpc", "args", "arg", "typeDef", "type", "items", "typeDef", TEST_INLINE_REFS_FLAG], ["#/components/scalars/Shared"])
  })

  it('no synthetic', () => {
    const graphApi = graphapi`
      type Query {
        rpc(arg: [Shared]): Shared
      }
      
      scalar Shared @specifiedBy(url:"http://ya.ru")
    `
    const result = normalize(graphApi, { syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG, syntheticAllOfFlag: TEST_SYNTHETIC_ALL_OF_FLAG })
    expect(result).not.toHaveProperty(["queries", "rpc", "output", "typeDef", "allOf"])
  })
})

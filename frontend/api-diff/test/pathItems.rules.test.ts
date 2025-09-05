import { apiDiff, ClassifierType, DiffAction } from '../src'
import { diffsMatcher } from './helper/matchers'

const COMPONENTS_RESPONSE_PATH = [
  'components',
  'pathItems',
  'componentsPathItem',
  'post',
  'responses',
  '200',
]

describe('Openapi3.1 Components PathItems Rules', () => {
  test('reports changes to path items in components', async () => {
    const before = {
      'openapi': '3.1.0',
      'paths': {
        '/path1': {
          'post': {
            'responses': {
              '200': {},
            },
          },
        },
      },
      'components': {
        'pathItems': {
          'componentsPathItem': {
            'post': {
              'responses': {
                '200': {
                  'description': 'Pet successfully added',
                },
              },
            },
          },
        },
      },
    }

    const after = {
      'openapi': '3.1.0',
      'paths': {
        '/path1': {
          'post': {
            'responses': {
              '200': {},
            },
          },
        },
      },
      'components': {
        'pathItems': {
          'componentsPathItem': {
            'post': {
              'responses': {
                '200': {
                  'description': 'new value',
                },
              },
            },
          },
        },
      },
    }

    const result = apiDiff(before, after)
    expect(result.diffs).toEqual(diffsMatcher([
      expect.objectContaining({
        action: DiffAction.replace,
        beforeValue: 'Pet successfully added',
        afterValue: 'new value',
        beforeDeclarationPaths: [[
          ...COMPONENTS_RESPONSE_PATH,
          'description',
        ]],
        afterDeclarationPaths: [[
          ...COMPONENTS_RESPONSE_PATH,
          'description',
        ]],
        type: ClassifierType.annotation,
      }),
    ]))
  })
})

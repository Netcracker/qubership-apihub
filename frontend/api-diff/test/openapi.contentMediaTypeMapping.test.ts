import { contentMediaTypeMappingResolver } from '../src/openapi/openapi3.mapping'
import { DiffAction } from '../src'

// Mock context for testing
const mockContext = {} as any

describe('Content Media Type Mapping', () => {
  
  describe('Exact Matching Cases', () => {
    it('should map identical media types', () => {
      const before = { 'application/json': {} }
      const after = { 'application/json': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 'application/json': 'application/json' }
      })
    })

    it('should map multiple exact matches', () => {
      const before = { 
        'application/json': {},
        'text/*': {},
        '*/*': {}
      }
      const after = { 
        'application/json': {},
        'text/*': {},
        '*/*': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json': 'application/json',
          'text/*': 'text/*',
          '*/*': '*/*'
        }
      })
    })

    it('should match media types ignoring parameters', () => {
      const before = { 'application/json; charset=utf-8': {} }
      const after = { 'application/json; charset=iso-8859-1': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 'application/json; charset=utf-8': 'application/json; charset=iso-8859-1' }
      })
    })

    it('should prefer exact matches over wildcard compatibility', () => {
      const before = { 
        'application/json': {},
        '*/*': {}
      }
      const after = { 
        'application/json': {},
        'text/xml': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json': 'application/json',
          '*/*': 'text/xml'
        }
      })
    })
  })

  describe('Wildcard Fallback Cases', () => {
    it('should map wildcard to specific when exactly one unmapped item on each side', () => {
      const before = { '*/*': {} }
      const after = { 'application/json': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { '*/*': 'application/json' }
      })
    })    

    it('should map partial wildcards', () => {
      const before = { 'application/*': {} }
      const after = { 'application/json': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 'application/*': 'application/json' }
      })
    })

    it('should map wildcard to wildcard', () => {
      const before = { '*/*': {} }
      const after = { 'application/*': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { '*/*': 'application/*' }
      })
    })    
  })

  describe('No Mapping Cases', () => {
    it('should mark completely different types as added/removed', () => {
      const before = { 'application/json': {} }
      const after = { 'text/xml': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['text/xml'],
        removed: ['application/json'],
        mapped: {}
      })
    })    

    it('should not map incompatible wildcards when multiple unmapped', () => {
      const before = { 
        'application/*': {},
        'text/xml': {}
      }
      const after = { 
        '*/*': {},
        'video/mp4': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['*/*', 'video/mp4'],
        removed: ['application/*', 'text/xml'],
        mapped: {}
      })
    })

    it('should not map incompatible types even with single unmapped items', () => {
      const before = { 'application/json': {} }
      const after = { 'text/*': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['text/*'],
        removed: ['application/json'],
        mapped: {}
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty before object', () => {
      const before = {}
      const after = { 'application/json': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['application/json'],
        removed: [],
        mapped: {}
      })
    })

    it('should handle empty after object', () => {
      const before = { 'application/json': {} }
      const after = {}
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: ['application/json'],
        mapped: {}
      })
    })

    it('should handle both empty objects', () => {
      const before = {}
      const after = {}
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: {}
      })
    })

    it('should handle malformed media types gracefully', () => {
      const before = { 'invalid-media-type': {} }
      const after = { 'also-invalid': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['also-invalid'],
        removed: ['invalid-media-type'],
        mapped: {}
      })
    })

    it('should handle media types with multiple parameters', () => {
      const before = { 'application/json; charset=utf-8; boundary=something': {} }
      const after = { 'application/json; charset=iso-8859-1; version=1.0': {} }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json; charset=utf-8; boundary=something': 'application/json; charset=iso-8859-1; version=1.0' 
        }
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle mixed exact matches and wildcard fallback', () => {
      const before = { 
        'application/json': {},
        'text/*': {},
        '*/*': {}
      }
      const after = { 
        'application/json': {},
        'text/*': {},
        'image/png': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json': 'application/json',
          'text/*': 'text/*',
          '*/*': 'image/png'
        }
      })
    })

    it('should handle exact matches with remaining incompatible types', () => {
      const before = { 
        'application/json': {},
        'text/xml': {},
        'application/pdf': {}
      }
      const after = { 
        'application/json': {},
        'image/png': {},
        'video/mp4': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['image/png', 'video/mp4'],
        removed: ['text/xml', 'application/pdf'],
        mapped: { 'application/json': 'application/json' }
      })
    })

    it('should prioritize exact matches over potential wildcard matches', () => {
      const before = { 
        'application/json': {},
        'application/*': {}
      }
      const after = { 
        'application/json': {},
        'application/xml': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json': 'application/json',
          'application/*': 'application/xml'
        }
      })
    })

    it('should handle asymmetric counts with wildcard fallback', () => {
      const before = { 
        'application/json': {},
        'text/xml': {},
        '*/*': {}
      }
      const after = { 
        'application/json': {},
        'image/png': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['image/png'],
        removed: ['text/xml', '*/*'],
        mapped: { 
          'application/json': 'application/json'
        }
      })
    })
  })

  describe('Full Media Type Matching Priority Tests', () => {
    it('should prioritize exact full media type matches over base type matches', () => {
      const before = { 
        'application/json': {},
        'application/json; charset=utf-8': {}
      }
      const after = { 
        'application/json; charset=utf-8': {},
        'application/json': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json': 'application/json',
          'application/json; charset=utf-8': 'application/json; charset=utf-8'
        }
      })
    })

    it('should fall back to base type matching when no full media type matches exist', () => {
      const before = { 
        'application/json; charset=utf-8': {}
      }
      const after = { 
        'application/json; charset=iso-8859-1': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: [],
        removed: [],
        mapped: { 
          'application/json; charset=utf-8': 'application/json; charset=iso-8859-1'
        }
      })
    })

    it('should prioritize full media type matches even when base types could match differently', () => {
      const before = { 
        'application/json; charset=utf-8': {},
        'application/xml': {}
      }
      const after = { 
        'application/json; charset=utf-8': {},
        'application/json': {}
      }
      
      const result = contentMediaTypeMappingResolver(before, after, mockContext)
      
      expect(result).toEqual({
        added: ['application/json'],
        removed: ['application/xml'],
        mapped: { 
          'application/json; charset=utf-8': 'application/json; charset=utf-8'
        }
      })
    })
  })
})

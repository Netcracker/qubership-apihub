**Design Item ID**: DI-Portal-COMP-002   
**Design Item Name**: Severity of Changes   
**Related Design Items**:   

- DI-Portal-COMP-001: Semi-breaking severity of changes

**Related API**: -   
**Revision History:**   

| Date | Description |
| ---- | ----------- |
|      |             |

---

# Description

During any comparison, the system classify each change by severity. The system provides the following severities".

- Breaking – Breaking change is a change that breaks backward compatibility with the previous version of API. For example, deleting an operation, adding a required parameter or changing type of a parameter are breaking changes.
- Semi-breaking - Semi-breaking change is a change that breaks backward compatibility according to the rules (see more information about semi-breaking changes in DI-Portal-COMP-001: Semi-breaking severity of changes):
  - operation or entity in operation was annotated as deprecated in at least two previous consecutive releases and then it was deleted
  - operation is marked as no-BWC
- Deprecated - Deprecating change is a change that annotates an operation, parameter or schema as deprecated. Removing a "deprecated" annotation is also considered a deprecating change.
- Non-breaking – Non-breaking change is change that does not break backward compatibility with the previous version of API. For example, adding new operation or optional parameter is non-breaking change.
- Annotation – An annotation change is a change to enrich the API documentation with information that does not affect the functionality of the API. For example, adding/changing/deleting descriptions or examples is annotation change.
- Unclassified – An unclassified change is a change that cannot be classified as any of the other types.

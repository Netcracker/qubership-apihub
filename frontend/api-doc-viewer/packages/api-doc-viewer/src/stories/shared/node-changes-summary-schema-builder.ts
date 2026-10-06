export type SchemaPair = {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

/**
 * Case 1: object with 4 simple properties - one wholly added, one wholly removed, one with a
 * changed description, one with a changed type (string -> integer).
 */
export const buildCase1Schema = (): SchemaPair => ({
  before: {
    type: "object",
    description: "Node changes summary sample (object with simple properties)",
    properties: {
      propRemoved: {
        type: "string",
        description: "Property removed after the change",
      },
      propDescriptionChanged: {
        type: "string",
        description: "Original description",
      },
      propTypeChanged: {
        type: "string",
      },
    },
  },
  after: {
    type: "object",
    description: "Node changes summary sample (object with simple properties)",
    properties: {
      propAdded: {
        type: "string",
        description: "Property added after the change",
      },
      propDescriptionChanged: {
        type: "string",
        description: "Updated description",
      },
      propTypeChanged: {
        type: "integer",
      },
    },
  },
});

/**
 * Case 2: object with 2 properties - the first is Case 1's schema, the second is unchanged.
 */
export const buildCase2Schema = (): SchemaPair => {
  const caseOne = buildCase1Schema();
  const unchangedProp = {
    type: "string",
    description: "This property never changes",
  };
  return {
    before: {
      type: "object",
      description: "Node changes summary sample (object wrapping case 1)",
      properties: {
        caseOne: caseOne.before,
        unchangedProp,
      },
    },
    after: {
      type: "object",
      description: "Node changes summary sample (object wrapping case 1)",
      properties: {
        caseOne: caseOne.after,
        unchangedProp,
      },
    },
  };
};

/**
 * Case 3: array whose items schema is Case 1.
 */
export const buildCase3Schema = (): SchemaPair => {
  const items = buildCase1Schema();
  return {
    before: {
      type: "array",
      description: "Node changes summary sample (array wrapping case 1)",
      items: items.before,
    },
    after: {
      type: "array",
      description: "Node changes summary sample (array wrapping case 1)",
      items: items.after,
    },
  };
};

/**
 * Case 4: array whose items schema is Case 2.
 */
export const buildCase4Schema = (): SchemaPair => {
  const items = buildCase2Schema();
  return {
    before: {
      type: "array",
      description: "Node changes summary sample (array wrapping case 2)",
      items: items.before,
    },
    after: {
      type: "array",
      description: "Node changes summary sample (array wrapping case 2)",
      items: items.after,
    },
  };
};

/**
 * Case 5: object with 4 oneOf properties - one wholly added, one wholly removed, one whose
 * "number" variant is added, one whose "number" variant is removed.
 */
export const buildCase5Schema = (): SchemaPair => ({
  before: {
    type: "object",
    description: "Node changes summary sample (object with oneOf properties)",
    properties: {
      oneOfRemoved: {
        oneOf: [{ type: "string" }, { type: "number" }],
      },
      oneOfNumberAdded: {
        oneOf: [{ type: "string" }],
      },
      oneOfNumberRemoved: {
        oneOf: [{ type: "string" }, { type: "number" }],
      },
    },
  },
  after: {
    type: "object",
    description: "Node changes summary sample (object with oneOf properties)",
    properties: {
      oneOfAdded: {
        oneOf: [{ type: "string" }, { type: "number" }],
      },
      oneOfNumberAdded: {
        oneOf: [{ type: "string" }, { type: "number" }],
      },
      oneOfNumberRemoved: {
        oneOf: [{ type: "string" }],
      },
    },
  },
});

/**
 * Case 6: object with 2 oneOf properties - each is oneOf(string, object), where the object
 * variant is Case 1's schema (first property) and Case 2's schema (second property). Variant
 * selection for the "chosen object" story is scripted in the IT test via the `data-testid` on
 * `SelectNestedNodeRow`'s option buttons, not by fixture ordering.
 */
export const buildCase6Schema = (): SchemaPair => {
  const caseOne = buildCase1Schema();
  const caseTwo = buildCase2Schema();
  return {
    before: {
      type: "object",
      description: "Node changes summary sample (oneOf variants wrapping objects)",
      properties: {
        variantWithCaseOne: {
          oneOf: [{ type: "string" }, caseOne.before],
        },
        variantWithCaseTwo: {
          oneOf: [{ type: "string" }, caseTwo.before],
        },
      },
    },
    after: {
      type: "object",
      description: "Node changes summary sample (oneOf variants wrapping objects)",
      properties: {
        variantWithCaseOne: {
          oneOf: [{ type: "string" }, caseOne.after],
        },
        variantWithCaseTwo: {
          oneOf: [{ type: "string" }, caseTwo.after],
        },
      },
    },
  };
};

/**
 * Case 7: object with 2 oneOf properties - each is oneOf(string, array), where the array
 * variant is Case 3's schema (first property) and Case 4's schema (second property). `string`
 * is listed first (index 0, the combiner's default selection); the "chosen array" stories
 * script a selector click in the IT test via the `data-testid` on `SelectNestedNodeRow`'s
 * option buttons.
 */
export const buildCase7Schema = (): SchemaPair => {
  const caseThree = buildCase3Schema();
  const caseFour = buildCase4Schema();
  return {
    before: {
      type: "object",
      description: "Node changes summary sample (oneOf variants wrapping arrays)",
      properties: {
        variantWithCaseThree: {
          oneOf: [{ type: "string" }, caseThree.before],
        },
        variantWithCaseFour: {
          oneOf: [{ type: "string" }, caseFour.before],
        },
      },
    },
    after: {
      type: "object",
      description: "Node changes summary sample (oneOf variants wrapping arrays)",
      properties: {
        variantWithCaseThree: {
          oneOf: [{ type: "string" }, caseThree.after],
        },
        variantWithCaseFour: {
          oneOf: [{ type: "string" }, caseFour.after],
        },
      },
    },
  };
};

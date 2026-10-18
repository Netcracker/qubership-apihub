export type ValueRangeBounds = {
  minimum?: number;
  exclusiveMinimum?: number | boolean;
  maximum?: number;
  exclusiveMaximum?: number | boolean;
};

export type BuildValueRangeSchemaOptions = ValueRangeBounds & {
  type?: "integer" | "number";
  title?: string;
};

export const buildValueRangeSchema = ({
  type = "integer",
  title,
  minimum,
  exclusiveMinimum,
  maximum,
  exclusiveMaximum,
}: BuildValueRangeSchemaOptions = {}): Record<string, unknown> => {
  const schema: Record<string, unknown> = { type };
  if (title !== undefined) {
    schema.title = title;
  }
  if (minimum !== undefined) {
    schema.minimum = minimum;
  }
  if (exclusiveMinimum !== undefined) {
    schema.exclusiveMinimum = exclusiveMinimum;
  }
  if (maximum !== undefined) {
    schema.maximum = maximum;
  }
  if (exclusiveMaximum !== undefined) {
    schema.exclusiveMaximum = exclusiveMaximum;
  }
  return schema;
};

export const formatValidationCaseTitle = (subset: string, label: string): string =>
  `[${subset}] ${label}`;

export const formatValueRangeCaseTitle = (slug: string, label: string): string =>
  formatValidationCaseTitle(`value-range-${slug}`, label);

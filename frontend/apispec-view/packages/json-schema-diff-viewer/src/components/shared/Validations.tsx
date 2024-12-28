import { ActionType, Diff, DiffMetaRecord, DiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { safeStringify } from '@stoplight/json';
import { isRegularNode, RegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { Flex, HStack, Text, VStack } from '@stoplight/mosaic';
import { Dictionary, Optional } from '@stoplight/types';
import {
  applyMutationFromMeta,
  applyReplacedFromMeta,
  combineDiffMetas,
  DIFF_TYPE_COLOR_MAP,
  DiffBlock,
  DiffSide,
  isDiffMetaRecord,
  useDiffContext,
} from 'diff-block';
import { capitalize, entries, keys, omit, pick, uniq } from 'lodash';
import * as React from 'react';
import { useMemo } from 'react';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

type ValidationFormat = {
  name: string;
  values: string[];
};

export const numberValidationNames = [
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'exclusiveMinimum',
  'exclusiveMaximum',
];

const exampleValidationNames = ['examples'];

const excludedValidations = ['exclusiveMinimum', 'exclusiveMaximum', 'readOnly', 'writeOnly'];

const numberValidationFormatters: Record<string, (value: unknown) => string> = {
  minimum: value => `>= ${value}`,
  exclusiveMinimum: value => `> ${value}`,
  minItems: value => `>= ${value} items`,
  minLength: value => `>= ${value} characters`,
  maximum: value => `<= ${value}`,
  exclusiveMaximum: value => `< ${value}`,
  maxItems: value => `<= ${value} items`,
  maxLength: value => `<= ${value} characters`,
};

const createStringFormatter = (nowrap: boolean | undefined) => (value: unknown) => {
  return nowrap && typeof value === 'string' ? value : JSON.stringify(value);
};

const createValidationsFormatter =
  (name: string, options?: { exact?: boolean; nowrap?: boolean }) =>
  (value: unknown[] | unknown): ValidationFormat | null => {
    const values = Array.isArray(value) ? value : [value];
    if (values.length) {
      return {
        name: options?.exact ? name : values.length > 1 ? `${name}s` : `${name}`,
        values: values.map(createStringFormatter(options?.nowrap)),
      };
    }
    return null;
  };

const validationFormatters: (key: string) => (value: unknown) => ValidationFormat = key => {
  const defaultFormatters = {
    enum: createValidationsFormatter('Allowed value', { nowrap: true }),
    examples: createValidationsFormatter('Example', { nowrap: true }),
    multipleOf: createValidationsFormatter('Multiple of', { exact: true }),
    pattern: createValidationsFormatter('Match pattern', { exact: true, nowrap: true }),
    default: createValidationsFormatter('Default', { exact: true, nowrap: true }),
    style: createValidationsFormatter('Style', { exact: true, nowrap: true }),
  };
  if (key in defaultFormatters) {
    return defaultFormatters[key];
  }
  return createValidationsFormatter(capitalize(key), { nowrap: true });
};

const oasFormats = {
  int32: {
    minimum: 0 - 2 ** 31,
    maximum: 2 ** 31 - 1,
  },
  int64: {
    minimum: 0 - 2 ** 63,
    maximum: 2 ** 63 - 1,
  },
  float: {
    minimum: 0 - 2 ** 128,
    maximum: 2 ** 128 - 1,
  },
  double: {
    minimum: 0 - Number.MAX_VALUE,
    maximum: Number.MAX_VALUE,
  },
  byte: {
    pattern: '^[\\w\\d+\\/=]*$',
  },
};

function filterOutOasFormatValidations(format: string, values: Dictionary<unknown>) {
  if (!(format in oasFormats)) {
    return values;
  }

  const newValues = { ...values };

  for (const [key, value] of Object.entries(oasFormats[format])) {
    if (value === newValues[key]) {
      delete newValues[key];
    }
  }

  return newValues;
}

export const Validations: React.FunctionComponent<{
  schemaNode: SchemaNode;
  hideExamples?: boolean;
}> = (props) => {
  const { schemaNode, hideExamples } = props

  const validations = React.useMemo(() => {
    return isRegularNode(schemaNode) ? getValidationsFromSchema(schemaNode) : {};
  }, [schemaNode]);

  const numberValidations = pick(validations, numberValidationNames);

  const keyValueValidations = omit(validations, [
    ...keys(numberValidations),
    ...excludedValidations,
    ...(hideExamples ? exampleValidationNames : []),
  ]);

  if (keys(numberValidations).length === 0 && keys(keyValueValidations).length === 0) {
    return null;
  }

  return (
    <VStack spacing={1} maxW="full" flex={1}>
      <NumberValidations schemaNode={schemaNode} validations={numberValidations} />
      <KeyValueValidations schemaNode={schemaNode} validations={keyValueValidations} />
    </VStack>
  );
};

const NumberValidations: React.FC<{ schemaNode: SchemaNode; validations: Record<string, any> }> = ({
  schemaNode,
  validations,
}) => {
  const diffMetaKey = useDiffMetaKey()

  const { side } = useDiffContext();

  const diffMeta: Record<string, Diff> | undefined = schemaNode[diffMetaKey];

  const validationsKeys = keys(validations);

  const combinedNumberDiffMeta: Diff | undefined = React.useMemo(() => {
    const numberDiffs = pick(diffMeta, validationsKeys);
    return combineDiffMetas(numberDiffs);
  }, [diffMeta, validationsKeys]);

  // TODO 30.07.24 // Remove redundant deprecated JSV
  return (
    <>
      {validationsKeys.length > 0 ? (
        <DiffBlock
          id={schemaNode.path.join('/') + 'ΘnumberValidations'}
          type={combinedNumberDiffMeta?.type}
          action={combinedNumberDiffMeta?.action}
          cause={undefined}
        >
          <HStack color="muted" maxW="full" spacing={1}>
            {validationsKeys
              .map(key => {
                const meta = diffMeta?.[key];
                const value = validations[key];
                return [key, side === 'before' ? applyReplacedFromMeta(value, meta) : value];
              })
              .map(([key, value]) => [key, numberValidationFormatters[key](value)])
              .map(([key, value], i) => (
                <Value
                  key={i}
                  name={value}
                  style={diffMeta && key in diffMeta ? `${side}-${diffMeta[key].action}` : 'none'}
                />
              ))}
          </HStack>
        </DiffBlock>
      ) : null}
    </>
  );
};

const KeyValueValidations: React.FC<{ schemaNode: SchemaNode; validations: Record<string, any> }> = ({
  schemaNode,
  validations,
}) => {
  return (
    <>
      {entries(validations)
        .filter(([, value]) => value !== void 0)
        .map(([key, value]) => (
          <KeyValueValidation key={key} validation={[key, value]} schemaNode={schemaNode} />
        ))}
    </>
  );
};

function useValidationDiffMeta(schemaNode: SchemaNode, validationKey: string): Diff | DiffMetaRecord | undefined {
  const diffMetaKey = useDiffMetaKey()
  const diffMetaForSchema: Record<string, Diff | DiffMetaRecord> | undefined = schemaNode[diffMetaKey];
  const key = validationKey === 'examples' ? 'example' : validationKey;
  return diffMetaForSchema?.[key];
}

const KeyValueValidation: React.FC<{
  schemaNode: SchemaNode;
  validation: [key: string, value: unknown];
}> = ({ schemaNode, validation: [key, value] }) => {
  const { side } = useDiffContext();

  const diffMeta = useValidationDiffMeta(schemaNode, key);

  const combinedMeta: Diff | undefined = React.useMemo(() => {
    if (isDiffMetaRecord(diffMeta)) {
      return combineDiffMetas({
        // @ts-ignore
        array: combineDiffMetas(diffMeta),
        foo: { type: 'unclassified', action: 'replace', beforeValue: null } as DiffReplace,
      });
    }
    return diffMeta;
  }, [diffMeta]);

  // @ts-ignore
  const arrayDiffMeta: { [key: number]: Diff } | undefined = React.useMemo(
    () => (isDiffMetaRecord(diffMeta) ? diffMeta : undefined),
    [diffMeta],
  );

  const validation = React.useMemo(() => {
    let patchedValue = side === 'before' ? applyReplacedFromMeta(value, diffMeta) : value;
    if (side === 'before') {
      patchedValue = applyMutationFromMeta(patchedValue, diffMeta, 'add');
    }
    if (side === 'after') {
      patchedValue = applyMutationFromMeta(patchedValue, diffMeta, 'remove');
    }
    return validationFormatters(key)(patchedValue);
  }, [diffMeta, key, side, value]);

  // TODO 30.07.24 // Remove redundant deprecated JSV
  return (
    <DiffBlock
      id={schemaNode.path.join('/') + 'ΘkeyValueValidationsΘ' + key}
      type={combinedMeta?.type}
      action={combinedMeta?.action}
      cause={undefined}
    >
      {validation && (
        <Flex
          flexWrap
          color="muted"
          alignItems="baseline"
          overflowX="scroll"
          overflowY="scroll"
          style={{ maxHeight: '300px' }}
        >
          <Text pr={1}>{capitalize(validation.name)}:</Text>

          <Flex flexWrap flex={1} style={{ gap: 4 }}>
            {uniq(validation.values).map((value, index) => (
              <Value
                key={value}
                name={value}
                style={
                  arrayDiffMeta
                    ? `${side}-${arrayDiffMeta[index]?.action}`
                    : combinedMeta
                    ? `${side}-${combinedMeta?.action}`
                    : 'none'
                }
              />
            ))}
          </Flex>
        </Flex>
      )}
    </DiffBlock>
  );
};

function useFormattedValue(name: string): Optional<string> {
  return useMemo(() => {
    try {
      const parsed = JSON.parse(name);
      return safeStringify(parsed, undefined, 2);
    } catch (e) {
      return undefined;
    }
  }, [name]);
}

const Value = ({ name, style = 'none' }: { name: string; style?: 'none' | `${DiffSide}-${ActionType}` }) => {
  const styleProps = React.useMemo(() => {
    switch (style) {
      case 'before-replace':
        return {
          borderColor: '#FFB02E',
          textDecoration: 'line-through',
        };
      case 'after-replace':
        return {
          borderColor: '#FFB02E',
        };
      case 'before-remove':
        return {
          borderColor: DIFF_TYPE_COLOR_MAP.breaking,
          textDecoration: 'line-through',
        };
      case 'after-add':
        return {
          borderColor: DIFF_TYPE_COLOR_MAP['non-breaking'],
        };
      case 'none':
      default:
        return {};
    }
  }, [style]);

  const value = useFormattedValue(name) ?? name;

  return (
    <Text flexWrap px={1} bg="canvas-tint" color="muted" border rounded wordBreak="all" maxW="full" style={styleProps}>
      <pre>{value}</pre>
    </Text>
  );
};

export function getValidationsFromSchema(schemaNode: RegularNode) {
  return {
    ...(schemaNode.enum !== null
      ? { enum: schemaNode.enum }
      : // in case schemaNode is type: "array", check if its child have defined enum
      schemaNode.primaryType === 'array' &&
        schemaNode.children?.length === 1 &&
        isRegularNode(schemaNode.children[0]) &&
        schemaNode.children[0].enum !== null
      ? { enum: schemaNode.children[0].enum }
      : null),
    ...('annotations' in schemaNode
      ? {
          ...(schemaNode.annotations.default !== void 0 ? { default: schemaNode.annotations.default } : null),
          ...(schemaNode.annotations.examples ? { examples: schemaNode.annotations.examples } : null),
        }
      : null),
    ...getFilteredValidations(schemaNode),
  };
}

function getFilteredValidations(schemaNode: RegularNode) {
  if (schemaNode.format !== null) {
    return filterOutOasFormatValidations(schemaNode.format, schemaNode.validations);
  }

  return schemaNode.validations;
}

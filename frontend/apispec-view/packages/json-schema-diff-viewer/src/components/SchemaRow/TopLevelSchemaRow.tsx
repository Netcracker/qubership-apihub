import { isRegularNode, RegularNode, SchemaNode } from '@stoplight/json-schema-tree';
import { Box, Flex, HStack, Tab, TabList, TabPanel, TabPanels, Tabs } from '@stoplight/mosaic';
import { useAtom } from 'jotai';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import * as React from 'react';

import { COMBINER_NAME_MAP } from '../../consts';
import { useIsOnScreen } from '../../hooks/useIsOnScreen';
import { calculateChildrenToShow, isComplexArray } from '../../tree';
import { showPathCrumbsAtom } from '../PathCrumbs/state';
import { ChildStack } from '../shared/ChildStack';
import { SchemaRow, SchemaRowProps } from './SchemaRow';
import { choicesAtom, selectedChoiceAtom } from './state';

export const TopLevelSchemaRow = ({ schemaNode }: Pick<SchemaRowProps, 'schemaNode'>) => {
  const choices = useAtomValue(choicesAtom(schemaNode));
  const [selectedChoice, setSelectedChoice] = useAtom(selectedChoiceAtom(schemaNode));

  const childNodes = React.useMemo(() => calculateChildrenToShow(selectedChoice.type), [selectedChoice.type]);
  const nestingLevel = 0;

  // regular objects are flattened at the top level
  if (isRegularNode(schemaNode) && isPureObjectNode(schemaNode)) {
    return (
      <>
        <ScrollCheck />
        <ChildStack schemaNode={schemaNode} childNodes={childNodes} currentNestingLevel={nestingLevel} />
      </>
    );
  }

  if (isRegularNode(schemaNode) && choices.length > 1) {
    const combiner = isRegularNode(schemaNode) && schemaNode.combiners?.length ? schemaNode.combiners[0] : null;

    return (
      <>
        <ScrollCheck />

        {combiner !== null ? (
          <Flex alignItems="center" color="muted" fontSize="base" pb={1}>
            {`(${COMBINER_NAME_MAP[combiner]})`}
          </Flex>
        ) : null}

        <HStack
          spacing={8}
          as={Tabs}
          appearance="pill"
          selectedId={choiceTabId(selectedChoice)}
          onChange={(value: string) =>
            setSelectedChoice(choices.find(choice => choiceTabId(choice) === value) ?? choices[0])
          }
        >
          <div className="sl-responses-tab-list">
            <TabList density="compact" fontSize="sm">
              {choices.map(choice => (
                <Tab key={choice.type.id} id={choiceTabId(choice)}>
                  {choice.title}
                </Tab>
              ))}
            </TabList>
          </div>
          <TabPanels>
            {choices.map(choice => {
              const nodes = calculateChildrenToShow(choice.type);
              return (
                <TabPanel key={choice.type.id} id={choiceTabId(choice)}>
                  <ChildStack schemaNode={schemaNode} childNodes={nodes} currentNestingLevel={nestingLevel} />
                </TabPanel>
              );
            })}
          </TabPanels>
        </HStack>
      </>
    );
  }

  if (isComplexArray(schemaNode) && isPureObjectNode(schemaNode.children[0])) {
    return (
      <>
        <ScrollCheck />

        <Box fontFamily="mono" fontWeight="semibold" fontSize="base" pb={4}>
          array of:
        </Box>

        {childNodes.length > 0 ? (
          <ChildStack schemaNode={schemaNode} childNodes={childNodes} currentNestingLevel={nestingLevel} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <ScrollCheck />
      <SchemaRow schemaNode={schemaNode} nestingLevel={nestingLevel} />
    </>
  );
};

function ScrollCheck() {
  const elementRef = React.useRef<HTMLDivElement>(null);

  const isOnScreen = useIsOnScreen(elementRef);
  const setShowPathCrumbs = useUpdateAtom(showPathCrumbsAtom);
  React.useEffect(() => {
    setShowPathCrumbs(!isOnScreen);
  }, [isOnScreen, setShowPathCrumbs]);

  return <div ref={elementRef} />;
}

function isPureObjectNode(schemaNode: RegularNode) {
  return schemaNode.primaryType === 'object' && schemaNode.types?.length === 1;
}

/**
 * Identifies a combiner branch for `Tab` and `TabPanel`.
 *
 * These ids reach the document rather than staying inside one tab list, and a page can render
 * several combiners at once, so a bare index would collide between them. Combiner branch titles
 * are derived from the node type ('object', 'string', ...) and are not unique either. Every choice
 * already carries a node whose `id` is unique per tree, which makes it the one safe suffix.
 */
function choiceTabId({ type }: { type: SchemaNode }) {
  return `choice-${type.id}`;
}

import { isRegularNode, RegularNode } from '@stoplight/json-schema-tree';
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
          selectedId={selectedChoice.title}
          onChange={(value: string) => setSelectedChoice(choices.find(c => c.title === value)!)}
        >
          <div className="sl-responses-tab-list">
            <TabList density="compact" fontSize="sm">
              {choices.map((choice, index) => (
                <Tab key={choice.title} id={choice.title}>
                  {choice.title}
                </Tab>
              ))}
            </TabList>
          </div>
          <TabPanels>
            {choices.map((choice, index) => {
              const nodes = calculateChildrenToShow(choice.type);
              return (
                <TabPanel key={choice.title} id={choice.title}>
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

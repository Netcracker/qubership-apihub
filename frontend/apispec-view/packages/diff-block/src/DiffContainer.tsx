import { COMPARE_DISPLAY_MODE, useOperationDisplayMode } from '@stoplight/elements';
import { Box, Flex } from '@stoplight/mosaic';
import React from 'react';

import { DiffContextProvider, useDiffContext } from './DiffContext';

type DiffContainerProps = { children: React.ReactElement };

export const DiffContainer: React.FC<DiffContainerProps> = ({ children }) => {
  const [ref, setRef] = React.useState<HTMLDivElement | null>(null);

  const contextValue = useDiffContext();
  const isCompareMode = useOperationDisplayMode() === COMPARE_DISPLAY_MODE;

  // No need to create additional context if one had been provided earlier
  if (isCompareMode && contextValue.side !== 'undefined') {
    return <>{children}</>;
  }

  // standalone mode
  return (
    <Flex>
      {isCompareMode && (
        <Box
          ref={setRef}
          pos="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          pointerEvents="none"
          overflowX="hidden"
          overflowY="hidden"
        />
      )}
      <div style={{ flex: `0 1 ${isCompareMode ? '50%' : '100%'}`, minWidth: 0, zIndex: 10 }}>
        <DiffContextProvider containerElement={ref} side={isCompareMode ? 'before' : 'undefined'}>
          {children}
        </DiffContextProvider>
      </div>
      {isCompareMode && (
        <>
          <Box mx={6} w="px" bg="canvas-200" />
          <div style={{ flex: '0 1 50%', minWidth: 0, zIndex: 10 }}>
            <DiffContextProvider containerElement={ref} side="after">
              {React.Children.only(React.cloneElement(children))}
            </DiffContextProvider>
          </div>
        </>
      )}
    </Flex>
  );
};

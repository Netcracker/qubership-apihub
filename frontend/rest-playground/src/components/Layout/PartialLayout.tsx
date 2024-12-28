import { Box, Flex } from '@stoplight/mosaic'
import * as React from 'react'
import { useLocation } from 'react-router-dom'

type PartialLayoutProps = {
  maxContentWidth?: number;
  children?: React.ReactNode;
};

const MAX_CONTENT_WIDTH = 1800

export const PartialLayout = React.forwardRef<HTMLDivElement, PartialLayoutProps>(
  ({ children, maxContentWidth = MAX_CONTENT_WIDTH }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement | null>(null)
    const { pathname } = useLocation()

    React.useEffect(() => {
      // Scroll to top on page change
      scrollRef.current?.scrollTo(0, 0)
    }, [pathname])

    return (
      <Flex ref={ref} className="sl-elements-api" pin h="full">
        <Box ref={scrollRef} bg="canvas" flex={1} w="full" overflowY="auto">
          <Box style={{ maxWidth: `${maxContentWidth}px` }}>{children}</Box>
        </Box>
      </Flex>
    )
  },
)

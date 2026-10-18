import * as React from 'react'
import { FC, memo, useEffect, useState } from 'react'
import { Box, IconButton, Tab, Tooltip, Typography } from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Flex } from '@stoplight/mosaic'
import { NonIdealState } from '../NonIdealState'
import { FullscreenIcon } from '../../icons'
import { openFullscreenExamplesPopup } from '../events'
import { ResponseExamples } from './ResponseExamples'
import { RequestExamples } from './RequestExamples/RequestExamples'
import { useTransformDocumentToNode } from '../../hooks/useTransformDocumentToNode'

export type ExamplesProps = {
  document: string;
  fullScreenAvailable: boolean;
};

export const Examples: FC<ExamplesProps> = memo<ExamplesProps>(({ document: documentData, fullScreenAvailable }) => {
  const [activeTab, setActiveTab] = useState<ExamplesTab>(REQUEST_EXAMPLE_TAB)
  const [disabledRequestTab, setDisabledRequestTab] = useState(false)
  const httpOperation = useTransformDocumentToNode(documentData)
  const requestBody = httpOperation?.request?.body

  useEffect(() => {
    if (!requestBody) {
      setActiveTab(RESPONSE_EXAMPLE_TAB)
      setDisabledRequestTab(true)
      return
    }
    setActiveTab(REQUEST_EXAMPLE_TAB)
    setDisabledRequestTab(false)
  }, [requestBody, httpOperation])

  if (!httpOperation) {
    return (
      <Flex justify="center" alignItems="center" w="full" minH="screen">
        <NonIdealState
          title="Failed to parse OpenAPI file"
          description="Please make sure your OpenAPI file is valid and try again"
        />
      </Flex>
    )
  }

  return (
    <Box ml={1} width="100%" height="100%">
      <TabContext value={activeTab}>
        <Box display="flex" alignItems="center">
          <TabList
            onChange={(_, value) => setActiveTab(value)}
            className="MuiButtonBase-root custom"
            color={ACTIVE_TAB_COLOR}
            sx={{ marginBottom: '16px', borderBottom: 1, borderColor: '#D5DCE3', width: '100%' }}
          >
            <Tab
              key={REQUEST_EXAMPLE_TAB}
              value={REQUEST_EXAMPLE_TAB}
              disableRipple
              className="MuiButtonBase-root custom"
              style={getTabStyles(activeTab, REQUEST_EXAMPLE_TAB, disabledRequestTab)}
              disabled={disabledRequestTab}
              icon={
                <Tooltip title={disabledRequestTab ? 'Request example is not applicable to the operation' : ''}>
                  <Typography variant="inherit">Request Example</Typography>
                </Tooltip>
              }
            />
            <Tab
              key={RESPONSE_EXAMPLE_TAB}
              label="Response Example"
              value={RESPONSE_EXAMPLE_TAB}
              disableRipple
              className="MuiButtonBase-root custom"
              style={getTabStyles(activeTab, RESPONSE_EXAMPLE_TAB)}
            />
          </TabList>
          {fullScreenAvailable && (
            <IconButton
              sx={{ ml: 'auto', pr: 0, pb: 3 }}
              disableRipple
              onClick={() => document.dispatchEvent(openFullscreenExamplesPopup)}
            >
              <FullscreenIcon/>
            </IconButton>
          )}
        </Box>

        {activeTab === REQUEST_EXAMPLE_TAB && (
          <TabPanel value={REQUEST_EXAMPLE_TAB} sx={tabStyle}>
            {<RequestExamples httpOperation={httpOperation}/>}
          </TabPanel>
        )}

        {activeTab === RESPONSE_EXAMPLE_TAB && (
          <TabPanel value={RESPONSE_EXAMPLE_TAB} sx={tabStyle}>
            {<ResponseExamples httpOperation={httpOperation}/>}
          </TabPanel>
        )}
      </TabContext>
    </Box>
  )
})

const REQUEST_EXAMPLE_TAB = 'request'
const RESPONSE_EXAMPLE_TAB = 'response'

type ExamplesTab = typeof REQUEST_EXAMPLE_TAB | typeof RESPONSE_EXAMPLE_TAB;

const ACTIVE_TAB_COLOR = '#0068FF'
const NON_ACTIVE_TAB_COLOR = 'rgba(0, 0, 0, 0.85)'
const DISABLED_TAB_COLOR = 'rgba(0, 0, 0, 0.38)'

function getTabStyles(activeTab: ExamplesTab, currentTab: ExamplesTab, disabled?: boolean): React.CSSProperties {
  return {
    color: activeTab === currentTab ? ACTIVE_TAB_COLOR : disabled ? DISABLED_TAB_COLOR : NON_ACTIVE_TAB_COLOR,
    padding: 0,
    marginRight: currentTab === REQUEST_EXAMPLE_TAB ? '24px' : 0,
    cursor: 'pointer',
    pointerEvents: 'auto',
  }
}

// 100% - 90px for correct work of scroll inside the monaco-editor
const tabStyle = { p: 0, height: 'calc(100% - 90px)', overflow: 'hidden' }

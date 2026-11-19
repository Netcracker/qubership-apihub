import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { memo } from 'react'
import { Box, Typography } from '@mui/material'
import type { JSONValue } from '../entities/operations'

export type TagsTreeProps = {
  tree: JSONValue
}

export type Primitive = null | undefined | number | string | boolean

export function isPrimitive(tree: JSONValue): tree is Primitive {
  return ['undefined', 'number', 'string', 'boolean'].includes(typeof tree) || tree === null
}

const getTree = (tree: JSONValue): ReactNode => {
  if (isPrimitive(tree)) {
    return (
      <ul>
        <li>
          <Typography lineHeight={1.75} fontSize={13} marginLeft="8px" display="block">{`${tree}`}</Typography>
        </li>
      </ul>
    )
  }
  if (Array.isArray(tree)) {
    return (
      <ul>
        {tree.map((item, index) => {
          return (
            <li key={index}>
              <Box display="flex" marginLeft="8px">
                <Typography display="block" variant="subtitle1">- </Typography>
                {getTree(item)}
              </Box>
            </li>
          )
        })}
      </ul>
    )
  }
  if (typeof tree === 'object') {
    return (
      <ul>
        {Object.entries(tree).map(([key, value]) => {
          return (
            <li key={key} style={{ marginLeft: '8px' }}>
              <Box display="flex" flexDirection={isPrimitive(value) ? 'row' : 'column'}>
                <Typography sx={{ textWrap: 'nowrap' }} display="block" variant="subtitle1">{key}: </Typography>
                {getTree(value)}
              </Box>
            </li>
          )
        })}
      </ul>
    )
  }
}

export const CustomTagsTree: FC<TagsTreeProps> = memo<TagsTreeProps>(({ tree }) => {
  return (
    <>
      {getTree(tree)}
    </>
  )
})

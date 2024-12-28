/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IconButton, Typography } from '@mui/material'
import type { FC } from 'react'
import React, { memo, useCallback } from 'react'
import type { RefCallBack } from 'react-hook-form/dist/types'
import { UploadImageIcon } from '@netcracker/qubership-apihub-ui-shared/icons/UploadImageIcon'

export type ImageUploadingProps = Readonly<{
  title: string
  imageUrl?: string
  inputFileRef?: RefCallBack
  onChange: (value: string) => void
}>

export const ImageUploading: FC<ImageUploadingProps> = memo<ImageUploadingProps>(({
  title,
  imageUrl,
  inputFileRef,
  onChange,
}) => {

  const setImage = useCallback((newImage: string) => {
    if (imageUrl) {
      onChange('')
    }
    onChange(newImage)
  }, [imageUrl, onChange])

  return (
    <div>
      <input
        ref={inputFileRef}
        accept="image/*"
        hidden
        id="avatar-image-upload"
        type="file"
        onChange={(event) => {
          const newImage = event.target?.files?.[0]
          if (newImage) {
            setImage(URL.createObjectURL(newImage))
          }
        }}/>
      <label htmlFor="avatar-image-upload">
        <Typography noWrap variant="subtitle2">{title}</Typography>
        <IconButton
          color="primary"
          component="span"
          onClick={(event) => {
            if (imageUrl) {
              event.preventDefault()
              onChange('')
            }
          }}
        >
          {imageUrl ? <img style={{
            height: '44px',
            width: '44px',
          }} alt={title ?? 'Logo'} src={imageUrl}/> : <UploadImageIcon/>}
        </IconButton>
      </label>
    </div>
  )
})

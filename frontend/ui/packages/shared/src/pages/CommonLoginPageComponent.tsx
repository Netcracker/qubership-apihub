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

import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'
import { useSearchParam } from 'react-use'
import {
  Alert,
  Box,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography,
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import { useSystemConfiguration } from '../hooks/authorization/useSystemConfiguration'
import type { Credentials } from '../hooks/authorization'
import { useAuthorization } from '../hooks/authorization'
import { redirectToSaml } from '../utils/redirects'

export type CommonLoginPageComponentProps = {
  applicationName: string
  onLogin: (credentials: Credentials) => void
  isLoading: boolean
  isError: boolean
}

export const CommonLoginPageComponent: FC<CommonLoginPageComponentProps> = memo(({
  applicationName,
  onLogin,
  isLoading,
  isError,
}) => {
  const userView = useSearchParam('userView')
  const redirectUri = useSearchParam('redirectUri')

  const [passwordVisible, setPasswordVisible] = useState(false)
  const [authorization] = useAuthorization({ cookie: userView })
  const [ssoIntegration] = useSystemConfiguration()

  useEffect(() => {
    if (authorization) {
      location.replace(redirectUri ?? location.origin)
    }
  }, [authorization, redirectUri])

  const { control, handleSubmit } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  })

  return (
    <>
      <Grid container component="main" sx={{ height: '100vh', backgroundColor: 'white' }}>
        <Grid item xs={false} sm={4} md={5} sx={{
          backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI2IiBoZWlnaHQ9IjkwMCIgdmlld0JveD0iMCAwIDEwMjYgOTAwIiBmaWxsPSJub25lIj4NCiAgPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzU1NzEwXzI5MjU1NCkiPg0KICAgIDxyZWN0IHdpZHRoPSIxMDI1LjIyIiBoZWlnaHQ9IjkwMCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzU1NzEwXzI5MjU1NCkiLz4NCiAgICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMF9kXzU1NzEwXzI5MjU1NCkiPg0KICAgICAgPHBhdGgNCiAgICAgICAgZD0iTTQ5OC4xOTYgMTkyLjQxNkM1MzkuOTMxIDEwMy4xMDMgNjE1LjE2NyAyMi44MDY1IDY0NC43MyAtMS44ODY1MlYtNTQuMDA3OEgtMzE3LjQ3M1Y5NDIuMzY5SDQyLjcwMTZDMTUxLjIxMyA3NDguMzAxIDM3NS45MDggNjcyLjMzMiA0NDIuMzE1IDUzOS42MjVDNDk4LjE5NiA0MjcuOTU1IDQxNi42ODggMzY2Ljg0MiA0OTguMTk2IDE5Mi40MTZaIg0KICAgICAgICBmaWxsPSJ1cmwoI3BhaW50MV9saW5lYXJfNTU3MTBfMjkyNTU0KSIvPg0KICAgIDwvZz4NCiAgICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMV9kXzU1NzEwXzI5MjU1NCkiPg0KICAgICAgPHBhdGgNCiAgICAgICAgZD0iTTMzMy42MzcgMjE2LjYzNkMzNzUuNjk0IDE2Mi4wMzYgMzk1LjQzMSA0NS4wODg2IDQwMC4wNDIgLTYuNTYwMjdWLTEwOC45NTdILTMzMC40MThWOTIxLjI3MUMtMTYxLjYzNyA4NzYuMDc4IDEwNS44MjkgNzEwLjA2NSAxNTguNCA2MTEuMzc5QzIxMC45NzEgNTEyLjY5MyAxODYuMDY5IDQ2MC4xMjIgMjE0LjY2IDM2OC44MTVDMjQzLjI1MSAyNzcuNTA3IDI4MS4wNjYgMjg0Ljg4NiAzMzMuNjM3IDIxNi42MzZaIg0KICAgICAgICBmaWxsPSJ1cmwoI3BhaW50Ml9saW5lYXJfNTU3MTBfMjkyNTU0KSIvPg0KICAgIDwvZz4NCiAgICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMl9kXzU1NzEwXzI5MjU1NCkiPg0KICAgICAgPHBhdGgNCiAgICAgICAgZD0iTTgzMi41ODcgOTcuMDU5OEM4NjguNzQyIDUuNTY3NTMgODQ1LjExOCAtMTguNzcwOSA4MzIuNTg3IC00Ny4yMjA3SDE0NzUuMjNWMTEwNkgzMjkuNjM4QzMzOC4xMDUgMTA3Mi40NyAzMTQuNzM2IDk5Ny4yMjQgNDI4LjE5NiA4NjAuMTE5QzU0MS42NTUgNzIzLjAxMyA2NzMuMDY2IDcwMC41OTggNzEyLjY5MiA1ODcuODE1Qzc1Mi4zMTggNDc1LjAzMyA2ODQuMjYgNDExLjM3MyA3MTIuNjkyIDMxMi40NjlDNzQxLjEyNCAyMTMuNTY1IDc5Ni40MzIgMTg4LjU1MiA4MzIuNTg3IDk3LjA1OThaIg0KICAgICAgICBmaWxsPSJ1cmwoI3BhaW50M19saW5lYXJfNTU3MTBfMjkyNTU0KSIvPg0KICAgIDwvZz4NCiAgICA8ZyBmaWx0ZXI9InVybCgjZmlsdGVyM19kXzU1NzEwXzI5MjU1NCkiPg0KICAgICAgPHBhdGgNCiAgICAgICAgZD0iTTE5OC4wMDMgMTQ0Ljc3M0MyNDAuODQyIDc4LjY5NDkgMjIwLjQzOCAtMi4xMTgwOSAyMTQuMDI4IC0zNC43MDExTC0yODQuMzMzIC00OS4xMjNDLTI5Ny4xNTIgMjA4Ljg3MSAtMzA3Ljg5OSA3MjEuNDAzIC0yMjcuMTM2IDcwMy40NTVDLTEyNi4xODIgNjgxLjAyMSAtMzUuNzgxIDYxMi4wNjEgLTEwLjE0MTggNTQ5LjAwN0MxNS40OTc0IDQ4NS45NTIgLTUyLjA5MjEgNDI3LjEgLTI0Ljg1MDYgMzU0Ljk5QzIuMzkwOTkgMjgyLjg3OSAxNTUuMTY1IDIxMC44NTEgMTk4LjAwMyAxNDQuNzczWiINCiAgICAgICAgZmlsbD0idXJsKCNwYWludDRfbGluZWFyXzU1NzEwXzI5MjU1NCkiLz4NCiAgICA8L2c+DQogICAgPGcgZmlsdGVyPSJ1cmwoI2ZpbHRlcjRfZF81NTcxMF8yOTI1NTQpIj4NCiAgICAgIDxwYXRoDQogICAgICAgIGQ9Ik0xMDMwLjUyIDE1Mi4zNzFDMTAzOC44MyA3OS45NjU3IDEwODkuMzcgMTUuMzc0MSAxMTEzLjYxIC03Ljg3MTA5SDE1MDFWMTExOS45OUg5NDcuMzIxSDU2MC40MjZDNTYwLjQyNiAxMTE5Ljk5IDY2My4wODYgMTA1OC41NiA3MzIuOTUyIDk2My4wMzNDODAyLjgxOCA4NjcuNTAyIDc1Ni4wMTQgODE0LjM0NyA3ODAuMDA0IDY3OS4yOTJDODAzLjk5NCA1NDQuMjM3IDEwMzcuOTYgNDg4Ljc5MSAxMDU1LjkzIDM4Ni44MUMxMDczLjkxIDI4NC44MyAxMDIwLjEzIDI0Mi44NzggMTAzMC41MiAxNTIuMzcxWiINCiAgICAgICAgZmlsbD0idXJsKCNwYWludDVfbGluZWFyXzU1NzEwXzI5MjU1NCkiLz4NCiAgICA8L2c+DQogICAgPGcgZmlsdGVyPSJ1cmwoI2ZpbHRlcjVfZF81NTcxMF8yOTI1NTQpIj4NCiAgICAgIDxwYXRoDQogICAgICAgIGQ9Ik0xMjIxLjY1IDM2MS42NjlDMTI1Ny44OCAyNzcuNTE2IDEzNTMuNCAyNDMuNDMxIDE0MDAuNTggMjMxLjc4OVYxMDE0Ljg0SDEwMjMuNzZDOTYzLjIxOSA5ODguMDMyIDkwMy40MTggOTEwLjI4NyA5MjIuNTc0IDgyNi4xMTJDOTQ0LjQxNSA3MzAuMTM0IDExMTAuMTUgNzA3Ljg3IDExNzIuNjUgNTgyLjg3NkMxMjM1LjE1IDQ1Ny44ODEgMTE4NS40MiA0NDUuODIzIDEyMjEuNjUgMzYxLjY2OVoiDQogICAgICAgIGZpbGw9InVybCgjcGFpbnQ2X2xpbmVhcl81NTcxMF8yOTI1NTQpIi8+DQogICAgPC9nPg0KICA8L2c+DQogIDxkZWZzPg0KICAgIDxmaWx0ZXIgaWQ9ImZpbHRlcjBfZF81NTcxMF8yOTI1NTQiIHg9Ii01ODcuNDczIiB5PSItMTU0LjAwOCIgd2lkdGg9IjE0MDIuMiIgaGVpZ2h0PSIxNDM2LjM4IiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+DQogICAgICA8ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPg0KICAgICAgPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iaGFyZEFscGhhIi8+DQogICAgICA8ZmVPZmZzZXQgZHg9Ii01MCIgZHk9IjEyMCIvPg0KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTEwIi8+DQogICAgICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjE2ODYyNyAwIDAgMCAwIDAuMjc4NDMxIDAgMCAwIDAgMSAwIDAgMCAxIDAiLz4NCiAgICAgIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93XzU1NzEwXzI5MjU1NCIvPg0KICAgICAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3dfNTU3MTBfMjkyNTU0IiByZXN1bHQ9InNoYXBlIi8+DQogICAgPC9maWx0ZXI+DQogICAgPGZpbHRlciBpZD0iZmlsdGVyMV9kXzU1NzEwXzI5MjU1NCIgeD0iLTU1MC40MTgiIHk9Ii0yMDguOTU3IiB3aWR0aD0iMTEzMC40NiIgaGVpZ2h0PSIxNDMwLjIzIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+DQogICAgICA8ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPg0KICAgICAgPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iaGFyZEFscGhhIi8+DQogICAgICA8ZmVPZmZzZXQgZHg9Ii0yMCIgZHk9IjEwMCIvPg0KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTAwIi8+DQogICAgICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjEwNTg4MiAwIDAgMCAwIDAuMzcyNTQ5IDAgMCAwIDAgMSAwIDAgMCAxIDAiLz4NCiAgICAgIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93XzU1NzEwXzI5MjU1NCIvPg0KICAgICAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3dfNTU3MTBfMjkyNTU0IiByZXN1bHQ9InNoYXBlIi8+DQogICAgPC9maWx0ZXI+DQogICAgPGZpbHRlciBpZD0iZmlsdGVyMl9kXzU1NzEwXzI5MjU1NCIgeD0iMjc5LjYzOCIgeT0iLTI0Ny4yMjEiIHdpZHRoPSIxNTQ1LjYiIGhlaWdodD0iMTU1My4yMiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiPg0KICAgICAgPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4NCiAgICAgIDxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9ImhhcmRBbHBoYSIvPg0KICAgICAgPGZlT2Zmc2V0IGR4PSIxNTAiLz4NCiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEwMCIvPg0KICAgICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMC4wOTQzNDAzIDAgMCAwIDAgMC4yNzA4MTYgMCAwIDAgMCAwLjg3MDgzMyAwIDAgMCAxIDAiLz4NCiAgICAgIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93XzU1NzEwXzI5MjU1NCIvPg0KICAgICAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3dfNTU3MTBfMjkyNTU0IiByZXN1bHQ9InNoYXBlIi8+DQogICAgPC9maWx0ZXI+DQogICAgPGZpbHRlciBpZD0iZmlsdGVyM19kXzU1NzEwXzI5MjU1NCIgeD0iLTU0My4yMDEiIHk9Ii0xMTkuMTIzIiB3aWR0aD0iOTE3LjcyIiBoZWlnaHQ9IjExNTMuMDQiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4NCiAgICAgIDxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+DQogICAgICA8ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIgcmVzdWx0PSJoYXJkQWxwaGEiLz4NCiAgICAgIDxmZU9mZnNldCBkeD0iLTUwIiBkeT0iMTMwIi8+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIxMDAiLz4NCiAgICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAuMTEzNzI1IDAgMCAwIDAgMC4zNjQ3MDYgMCAwIDAgMCAxIDAgMCAwIDAuNiAwIi8+DQogICAgICA8ZmVCbGVuZCBtb2RlPSJub3JtYWwiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9ImVmZmVjdDFfZHJvcFNoYWRvd181NTcxMF8yOTI1NTQiLz4NCiAgICAgIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iZWZmZWN0MV9kcm9wU2hhZG93XzU1NzEwXzI5MjU1NCIgcmVzdWx0PSJzaGFwZSIvPg0KICAgIDwvZmlsdGVyPg0KICAgIDxmaWx0ZXIgaWQ9ImZpbHRlcjRfZF81NTcxMF8yOTI1NTQiIHg9IjU2MC40MjYiIHk9Ii00MDcuODcxIiB3aWR0aD0iMTQ0MC41NyIgaGVpZ2h0PSIxNTI3Ljg2IiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+DQogICAgICA8ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPg0KICAgICAgPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iaGFyZEFscGhhIi8+DQogICAgICA8ZmVPZmZzZXQgZHg9IjMwMCIgZHk9Ii0yMDAiLz4NCiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEwMCIvPg0KICAgICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMC4xNDExNzYgMCAwIDAgMCAwLjMyNTQ5IDAgMCAwIDAgMSAwIDAgMCAxIDAiLz4NCiAgICAgIDxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0iZWZmZWN0MV9kcm9wU2hhZG93XzU1NzEwXzI5MjU1NCIvPg0KICAgICAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3dfNTU3MTBfMjkyNTU0IiByZXN1bHQ9InNoYXBlIi8+DQogICAgPC9maWx0ZXI+DQogICAgPGZpbHRlciBpZD0iZmlsdGVyNV9kXzU1NzEwXzI5MjU1NCIgeD0iNzM4LjkzNCIgeT0iMTgxLjc4OSIgd2lkdGg9Ijg4MS42NDUiIGhlaWdodD0iMTE4My4wNSIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiPg0KICAgICAgPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4NCiAgICAgIDxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9ImhhcmRBbHBoYSIvPg0KICAgICAgPGZlT2Zmc2V0IGR4PSIyMCIgZHk9IjE1MCIvPg0KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTAwIi8+DQogICAgICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjExMzcyNSAwIDAgMCAwIDAuMzY0NzA2IDAgMCAwIDAgMSAwIDAgMCAwLjcgMCIvPg0KICAgICAgPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfNTU3MTBfMjkyNTU0Ii8+DQogICAgICA8ZmVCbGVuZCBtb2RlPSJub3JtYWwiIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9ImVmZmVjdDFfZHJvcFNoYWRvd181NTcxMF8yOTI1NTQiIHJlc3VsdD0ic2hhcGUiLz4NCiAgICA8L2ZpbHRlcj4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfNTU3MTBfMjkyNTU0IiB4MT0iNTEyLjYwOSIgeTE9IjAiIHgyPSI1MTIuNjA5IiB5Mj0iOTAwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMjU1MUZGIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDdFRkYiLz4NCiAgICA8L2xpbmVhckdyYWRpZW50Pg0KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQxX2xpbmVhcl81NTcxMF8yOTI1NTQiIHgxPSI1NTAuNjQzIiB5MT0iLTI5LjIyODciIHgyPSI0MC45NjY1IiB5Mj0iOTA3LjMwMiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPg0KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzAwNzFGRiIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDA3M0ZGIi8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Ml9saW5lYXJfNTU3MTBfMjkyNTU0IiB4MT0iMjAwLjI0MSIgeTE9Ii03My44MjM5IiB4Mj0iLTIxMy44NzIiIHkyPSI4NzUuNDQ5IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMDBBQ0ZGIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDc1RkYiLz4NCiAgICA8L2xpbmVhckdyYWRpZW50Pg0KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQzX2xpbmVhcl81NTcxMF8yOTI1NTQiIHgxPSIxMDQ2Ljc4IiB5MT0iLTE4LjA3ODMiIHgyPSI0NjUuNDc3IiB5Mj0iODk3LjM3OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPg0KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzFGNUFGRiIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDA5N0ZGIi8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50NF9saW5lYXJfNTU3MTBfMjkyNTU0IiB4MT0iLTM0LjM0MDciIHkxPSItNDkuMTIzIiB4Mj0iLTE3OC44MzIiIHkyPSI2ODQuMzIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMDBDQ0ZGIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMEExRkYiLz4NCiAgICA8L2xpbmVhckdyYWRpZW50Pg0KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ1X2xpbmVhcl81NTcxMF8yOTI1NTQiIHgxPSIxMDMwLjcxIiB5MT0iLTcuODcxMDkiIHgyPSIxMDMwLjcxIiB5Mj0iMTExOS45OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPg0KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzAwQjdGRiIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDA4OEZGIi8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfNTU3MTBfMjkyNTU0IiB4MT0iMTE1OS43NiIgeTE9IjIzMS43ODkiIHgyPSIxMTU5Ljc2IiB5Mj0iMTAxNC44NCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPg0KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzc5RERGOCIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDBDMUZGIi8+DQogICAgPC9saW5lYXJHcmFkaWVudD4NCiAgICA8Y2xpcFBhdGggaWQ9ImNsaXAwXzU1NzEwXzI5MjU1NCI+DQogICAgICA8cmVjdCB3aWR0aD0iMTAyNS4yMiIgaGVpZ2h0PSI5MDAiIGZpbGw9IndoaXRlIi8+DQogICAgPC9jbGlwUGF0aD4NCiAgPC9kZWZzPg0KPC9zdmc+DQo=)',
          backgroundSize: 'cover',
          height: 1,
        }}>
        </Grid>

        <Grid item component="div" xs={12} sm={8} md={5} sx={{ margin: 'auto' }}>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Typography component="h1" variant="h1" data-testid="ApihubLoginHeaderTypography">
              Log in to {applicationName}
            </Typography>
            {
              isError && <Alert severity="error">
                Invalid credentials, please try again
              </Alert>
            }
            <Box
              component="form"
              sx={{ my: 2, width: 1 }}
              onSubmit={handleSubmit(onLogin)}
            >
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <FormControl
                    sx={{ width: 1, mb: 2, display: 'block' }}
                    variant="outlined"
                    data-testid="LoginTextInput"
                  >
                    <InputLabel sx={{ fontSize: 15 }}>Username</InputLabel>
                    <OutlinedInput
                      {...field}
                      sx={{ '&.MuiInputBase-root': { fontSize: 15 } }}
                      fullWidth
                      required
                      label="Username"
                      name="username"
                      type="text"
                    />
                  </FormControl>
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <FormControl
                    sx={{ width: 1, mb: 2, display: 'block' }}
                    variant="outlined"
                    data-testid="PasswordTextInput"
                  >
                    <InputLabel sx={{ fontSize: 15 }}>Password</InputLabel>
                    <OutlinedInput
                      {...field}
                      sx={{ '&.MuiInputBase-root': { fontSize: 15 } }}
                      fullWidth
                      required
                      label="Password"
                      name="password"
                      type={passwordVisible ? 'text' : 'password'}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton edge="end" onClick={() => setPasswordVisible(!passwordVisible)}>
                            {passwordVisible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                )}
              />
              <LoadingButton
                type="submit"
                variant={ssoIntegration?.ssoIntegrationEnabled ? 'outlined' : 'contained'}
                loading={isLoading}
                data-testid="SignInButton"
              >
                Log in
              </LoadingButton>
              {ssoIntegration?.ssoIntegrationEnabled && <LoadingButton
                variant="contained"
                loading={isLoading}
                data-testid="SSOSignInButton"
                onClick={() => redirectToSaml()}
                sx={{ ml: '24px' }}
              >
                SSO Log in
              </LoadingButton>
              }
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  )
})

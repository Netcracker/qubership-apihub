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

import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { ErrorPage, NOT_FOUND_TITLE, SOMETHING_WENT_WRONG_TITLE } from './ErrorPage'
import { useLocation } from 'react-use'
import { useParams, useSearchParams } from 'react-router-dom'
import { PackageRedirectPage } from './PackageRedirectPage'
import type { LinkType } from './Notifications/Notification'
import { replaceParam } from '../utils/urls'
import type { ErrorStatus, FetchErrorDetails, FetchRedirectDetails, FetchRedirectType } from '../utils/requests'
import {
  ERROR_CODE_IDP_URL_NOT_FOUND,
  ERROR_CODE_OPERATION_NOT_FOUND,
  FETCH_ERROR_EVENT,
  FETCH_REDIRECT_EVENT,
  FETCH_REDIRECT_TYPE_PACKAGE,
} from '../utils/requests'

export type NotificationDetail = {
  title?: string
  message: string
  link?: LinkType
}

export type ExceptionSituationHandlerProps = PropsWithChildren<{
  homePath: string
  showErrorNotification?: (detail: NotificationDetail) => void
  redirectUrlFactory?: (currentPathname: string, searchParams: URLSearchParams, id: string) => string
}>

export const ExceptionSituationHandler: FC<ExceptionSituationHandlerProps> = memo<ExceptionSituationHandlerProps>(({
  homePath,
  showErrorNotification,
  redirectUrlFactory,
  children,
}) => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const params = useParams()

  const [exceptionDetails, setExceptionDetails] = useState<ExceptionDetails>()

  const packageRedirectFactory = useCallback((newPackageId: string) => {
    if (!location.pathname) {
      return homePath
    }

    const redirectedPathname = redirectUrlFactory?.(location.pathname, searchParams, newPackageId)
    if (redirectedPathname)

      return redirectUrlFactory?.(location.pathname, searchParams, newPackageId) ??
        replaceParam(location.pathname, params, 'packageId', newPackageId) ??
        homePath

  }, [homePath, location.pathname, params, redirectUrlFactory, searchParams])

  useEffect(() => {
    const errorHandler = (event: CustomEvent<FetchErrorDetails>): void => {
      const { title, message, status, code } = event.detail

      if (IGNORED_ERROR_CODES.includes(code)) {
        return
      }

      switch (status) {
        case 404:
        case 500:
          return setExceptionDetails({
            type: status,
            title: ERROR_TITLE_MAP[status],
            message: message,
          })
        default:
          showErrorNotification?.({ title, message })
      }
    }
    window.addEventListener(FETCH_ERROR_EVENT, errorHandler)
    return () => window.removeEventListener(FETCH_ERROR_EVENT, errorHandler)
  }, [showErrorNotification])

  useEffect(() => {
    const redirectHandler = (event: CustomEvent<FetchRedirectDetails>): void => {
      setExceptionDetails({
        type: event.detail.redirectType,
        id: event.detail.id,
      })
    }
    window.addEventListener(FETCH_REDIRECT_EVENT, redirectHandler)
    return () => window.removeEventListener(FETCH_REDIRECT_EVENT, redirectHandler)
  }, [])

  if (!exceptionDetails) {
    return <>{children}</>
  }

  if (exceptionDetails.type === 404 || exceptionDetails.type === 500) {
    return (
      <ErrorPage
        title={exceptionDetails.title}
        message={exceptionDetails.message}
        homePath={homePath}
      />
    )
  }

  if (exceptionDetails.type === FETCH_REDIRECT_TYPE_PACKAGE) {
    return (
      <PackageRedirectPage
        newId={exceptionDetails.id}
        href={packageRedirectFactory(exceptionDetails.id)}
      />
    )
  }

  return null
})

const ERROR_TITLE_MAP: Record<Exclude<ErrorStatus, null>, string> = {
  404: NOT_FOUND_TITLE,
  500: SOMETHING_WENT_WRONG_TITLE,
}

const IGNORED_ERROR_CODES = [ERROR_CODE_OPERATION_NOT_FOUND, ERROR_CODE_IDP_URL_NOT_FOUND]

type ExceptionType = FetchRedirectType | ErrorStatus

type AbstractExceptionDetails = {
  type: ExceptionType
}

type ErrorDetails = AbstractExceptionDetails & {
  type: ErrorStatus
  message: string
  title: string
}

type RedirectDetails = AbstractExceptionDetails & {
  type: FetchRedirectType
  id: string
}

type ExceptionDetails = ErrorDetails | RedirectDetails





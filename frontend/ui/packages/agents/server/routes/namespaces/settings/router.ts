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

import { Router } from 'express'
import { SETTINGS_DTO } from './data'

type SettingsRouter = Router

export function SettingsRouter(): SettingsRouter {
  const router: SettingsRouter = Router()

  getSettings(router)
  updateSettings(router)

  return router
}

function getSettings(router: SettingsRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(SETTINGS_DTO)
  })
}

function updateSettings(router: SettingsRouter): void {
  router.post('/', (req, res) => {
    const errorProbability = 0.125
    const statusCode = Math.random() < errorProbability ? 400 : 202

    setTimeout(() => {
      const updatedSettingsDto = JSON.parse(req.body)
      SETTINGS_DTO.name = updatedSettingsDto.name
      SETTINGS_DTO.version = updatedSettingsDto.version
      SETTINGS_DTO.previousVersion = updatedSettingsDto.previousVersion
      SETTINGS_DTO.autoDiscovery = updatedSettingsDto.autoDiscovery
      SETTINGS_DTO.schedules = updatedSettingsDto.schedules
      SETTINGS_DTO.emailNotificationsEnabled = updatedSettingsDto.emailNotificationsEnabled
      SETTINGS_DTO.emailNotificationList = updatedSettingsDto.emailNotificationList
      res.status(statusCode).send(updatedSettingsDto)
    }, 3000)
  })
}

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

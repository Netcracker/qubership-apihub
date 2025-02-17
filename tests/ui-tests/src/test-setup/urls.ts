import process from 'process'

export const BASE_URL = new URL(process.env.BASE_URL as string)

export const BASE_ORIGIN = BASE_URL.origin

const ticketSystemUrl = process.env.TICKET_SYSTEM_URL ? new URL(process.env.TICKET_SYSTEM_URL as string).origin : ''

export const TICKET_BASE_URL = ticketSystemUrl ? `${ticketSystemUrl}/browse/` : ''

export const { PLAYGROUND_BACKEND_HOST } = process.env

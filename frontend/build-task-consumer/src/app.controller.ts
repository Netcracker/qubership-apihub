import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): void {}
}

import { ConfigModule } from '@nestjs/config'
import { Module } from '@nestjs/common'
import { BuilderModule } from './modules/builder/builder.module'
import configuration from './config/configuration'
import { AppController } from './app.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BuilderModule
  ],
  controllers: [AppController],
  providers: [],
})

export class AppModule {}

import { GoogleMapsModule } from './scraper/google-maps.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';

@Module({
  imports: [
        ScheduleModule.forRoot(),
        GoogleMapsModule, ],
  controllers: [AppController],
  providers: [ 
         AppService],
})
export class AppModule {}

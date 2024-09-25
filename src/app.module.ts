import { GoogleMapsModule } from './scraper/google-maps.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
        ScheduleModule.forRoot(),
        GoogleMapsModule, ],
  controllers: [],
  providers: [ 
         AppService],
})
export class AppModule {}

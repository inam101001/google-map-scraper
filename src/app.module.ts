import { GoogleMapsModule } from './scraper/google-maps.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';

@Module({
  imports: [
        GoogleMapsModule, ],
  controllers: [],
  providers: [
         AppService],
})
export class AppModule {}

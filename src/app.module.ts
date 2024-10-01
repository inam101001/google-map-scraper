import { GoogleMapsModule } from './scraper/google-maps.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
        GoogleMapsModule, ],
  controllers: [AppController],
  providers: [ 
         AppService],
})
export class AppModule {}

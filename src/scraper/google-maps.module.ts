import { Module } from '@nestjs/common';
import { GoogleMapsController } from './google-maps.controller';
import { GoogleMapsService } from './google-maps.service';
import { GoogleMapsDbService } from './google-maps-db.service';
import { WebEmailsService } from './web-emails.service';

@Module({
  controllers: [GoogleMapsController],
  providers: [GoogleMapsService, GoogleMapsDbService, WebEmailsService],
})
export class GoogleMapsModule {}

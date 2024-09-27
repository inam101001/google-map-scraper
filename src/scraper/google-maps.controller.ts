import { Controller, Post } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('API')
export class GoogleMapsController {

    constructor(private readonly googleMapsService: GoogleMapsService) { }

    @Post('scrape-and-seed')
    async scrapeAndStore() {
        return this.googleMapsService.scrapeAndStore();
    }
}

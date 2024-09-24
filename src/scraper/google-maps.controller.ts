import { Controller, Post } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { GoogleMapsDbService } from './google-maps-db.service';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('API')
export class GoogleMapsController {
    private readonly collectionName: string = 'SCRAPED_DATA'; // Single collection for all scraped data

    constructor(
        private readonly googleMapsService: GoogleMapsService,
        private readonly googleMapsDbService: GoogleMapsDbService,
    ) { }

    @Post('scrape-&-seed')
    async scrapeAndStore() {
        try {
            while (true) {
                const queryDoc = await this.googleMapsDbService.fetchNextQuery();

                if (!queryDoc) {
                    console.log('No more queries to process. Scraping completed.');
                    break;
                }

                const { query, _key } = queryDoc;
                const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

                console.log(`Processing query: "${query}"`);

                const services = await this.googleMapsService.scrapeGoogleMaps(searchUrl);

                await this.googleMapsDbService.seedServiceData(services, this.collectionName);

                await this.googleMapsDbService.updateQueryStatus(_key, true);

                console.log(`Query "${query}" scraped and stored successfully.`);
            }

            return { message: 'Scraping process completed. No more queries.' };
        } catch (error) {
            console.error('Error during scraping and storing process:', error.message);
            return { message: 'Error during scraping and storing process: ' + error.message };
        }
    }
}

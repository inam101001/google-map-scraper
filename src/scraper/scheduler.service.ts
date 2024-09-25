import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleMapsDbService } from './google-maps-db.service';
import { GoogleMapsService } from './google-maps.service';  // To use `scrapeGoogleMaps`

@Injectable()
export class SchedulerService {
  private readonly collectionName: string = 'SCRAPED_DATA';

  constructor(
    private readonly googleMapsDbService: GoogleMapsDbService,
    private readonly googleMapsService: GoogleMapsService 
  ) {}

  @Cron(CronExpression.EVERY_8_HOURS)
  async handleCron() {
    console.log('Triggering scrapeAndStore Scheduler...');

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
      return { message: 'Error Triggering scrapeAndStore Scheduler: ' + error.message };
    }
  }
}

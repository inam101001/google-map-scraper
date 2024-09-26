import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleMapsService } from './google-maps.service'; 

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly googleMapsService: GoogleMapsService 
  ) {}

  @Cron(CronExpression.EVERY_8_HOURS)
  async handleCron() {
    this.logger.log('Triggering scrapeAndStore Scheduler...');

    try {
      const result = await this.googleMapsService.scrapeAndStore();
      this.logger.log(result.message);
    } catch (error) {
      this.logger.error('Error Triggering scrapeAndStore Scheduler:', error.message);
    }
  }
}

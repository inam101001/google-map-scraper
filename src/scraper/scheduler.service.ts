import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleMapsController } from './google-maps.controller';

@Injectable()
export class SchedulerService {
    constructor(private readonly googleMapsController: GoogleMapsController) { }

    @Cron(CronExpression.EVERY_8_HOURS)
    handleCron() {
        console.log('Triggering scrapeAndStore...');
        this.googleMapsController.scrapeAndStore().catch(error => {
            console.error('Error Triggering scrapeAndStore...', error.message);
        });
    }
}

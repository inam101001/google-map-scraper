import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require("puppeteer-extra-plugin-stealth");
import { WebEmailsService } from './web-emails.service';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly scrollDelay: number = 4000;

  constructor(private readonly webEmailsService: WebEmailsService) {
    puppeteer.use(StealthPlugin());
  }

  private async autoScroll(page): Promise<void> {
    await page.evaluate(async () => {
      const wrapper = document.querySelector('div[role="feed"]');

      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 1000;
        const scrollDelay = 4000;

        const timer = setInterval(async () => {
          const scrollHeightBefore = wrapper.scrollHeight;
          wrapper.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeightBefore) {
            totalHeight = 0;
            await new Promise<void>((resolve) => setTimeout(resolve, scrollDelay));

            const scrollHeightAfter = wrapper.scrollHeight;

            if (scrollHeightAfter > scrollHeightBefore) {
              return;
            } else {
              clearInterval(timer);
              resolve();
            }
          }
        }, 200);
      });
    });
  }
  async scrapeGoogleMaps(url: string): Promise<any[]> {
    const browser = await puppeteer.launch({ headless: true,args: [
      '--disable-gpu',
      '--no-sandbox'
    ],protocolTimeout: 90000 });
    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(20000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    await this.autoScroll(page);

    const services = await page.evaluate(() => {
      const serviceList: any[] = [];
      document.querySelectorAll('.Nv2PK').forEach((item: any) => {
        const company = item.querySelector('.qBF1Pd')?.textContent?.trim() || '';
        const serviceElement = Array.from(item.querySelectorAll('.W4Efsd')).find((el: Element) =>
          (el.textContent || '').includes('·') && !(el.textContent || '').includes('stars')
        ) as HTMLElement;
        const service = serviceElement ? (serviceElement.querySelector('span span') as HTMLElement)?.textContent?.trim() : '';
        const phoneNumber = item.querySelector('.UsdlK')?.textContent?.trim() || '';
        const websiteElement = item.querySelector('.lcr4fd[href^="http"]');
        const websiteUrl = websiteElement ? websiteElement.getAttribute('href') : null;

        serviceList.push({ company, service, phoneNumber, websiteUrl });

      });
      return serviceList;
    });
    this.logger.log(`Found ${services.length} services from Google Maps.`);

    // Call WebEmailsService to scrape emails for each website
   for (const service of services) {
      if (service.websiteUrl) {
        const email = await this.webEmailsService.scrapeEmailsFromWebsite(service.websiteUrl); // Scrape emails
        service.email = email; // Attach the scraped emails to the service object
      }
    }

    await browser.close();
    return services;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require("puppeteer-extra-plugin-stealth");
import { WebEmailsService } from './web-emails.service';
import { GoogleMapsDbService } from './google-maps-db.service';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly scrollDelay: number = 4000;
  private readonly collectionName: string = 'SCRAPED_DATA';

  constructor(
    private readonly webEmailsService: WebEmailsService,
    private readonly googleMapsDbService: GoogleMapsDbService,
  ) {
    puppeteer.use(StealthPlugin());
  }

  async scrapeAndStore(): Promise<{ message: string }> {
    try {
      while (true) {
        const queryDoc = await this.googleMapsDbService.fetchNextQuery();

        if (!queryDoc) {
          this.logger.log('No more queries to process. Scraping completed.');
          break;
        }

        const { query, _key } = queryDoc;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

        this.logger.log(`Processing query: "${query}"`);

        const services = await this.scrapeGoogleMaps(searchUrl, _key);

        await this.googleMapsDbService.seedServiceData(services, this.collectionName);
        await this.googleMapsDbService.updateQueryStatus(_key, true);

        this.logger.log(`Query "${query}" scraped and stored successfully.`);
      }

      return { message: 'Scraping process completed. No more queries.' };
    } catch (error) {
      this.logger.error('Error during scraping and storing process:', error.message);
      return { message: 'Error during scraping and storing process: ' + error.message };
    }
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
  async scrapeGoogleMaps(url: string, _key: string): Promise<any[]> {
    const browser = await puppeteer.launch({ protocolTimeout: 20000, headless: true,args: [
      '--disable-gpu',
      '--no-sandbox'
    ]});
    const page = await browser.newPage();
  
    try {
      await page.setDefaultNavigationTimeout(20000);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  
     // Check for the presence of the specific element that indicates a single result
      const isSingleResult = await page.evaluate(() => {
        const singleResultElement = document.querySelector('div.LRkQ2 > div.Gpq6kf.fontTitleSmall');
        return !!singleResultElement; // Return true if the element exists
      });
  
      if (isSingleResult) {
        this.logger.log('Single result detected. Skipping this query.');
        
        // Mark the query as processed in the DB (with no results)
        await this.googleMapsDbService.updateQueryStatus(_key, true);
  
        await browser.close();
        return []; // Return an empty array or handle it as per your logic
      }
  
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
  
    } catch (error) {
      this.logger.error(error.message);
      await browser.close();
      throw error;
    }
  }
  
}

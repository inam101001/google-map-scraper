import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require('puppeteer-extra-plugin-stealth');

@Injectable()
export class WebEmailsService {
  private readonly logger = new Logger(WebEmailsService.name);
  
  constructor() {
    puppeteer.use(StealthPlugin());
  }

  async scrapeEmailsFromWebsite(url: string): Promise<string | null> {
    let foundEmail: string | null = null;
    let retryCount = 0;
    const maxRetries = 3; // Max number of retries for launching the browser

    let browser;
    let page;

    // Retry only for launching the browser
    while (retryCount < maxRetries) {
      try {
        browser = await puppeteer.launch({
          headless: false,
          args: ['--disable-gpu', '--no-sandbox'],
          protocolTimeout: 90000, // Timeout for launching the browser
        });

        page = await browser.newPage();
        
        // Block unnecessary resources like images, fonts, and stylesheets
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (['image', 'stylesheet'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Page load (without retry logic)
        await page.setDefaultNavigationTimeout(20000); // Setting a default timeout for page loading
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

        const baseUrl = new URL(url).origin;
        const links = await this.extractLinksFromPage(page, baseUrl);
        const limitedLinks = links.slice(0, 10);

        for (const link of limitedLinks) {
          try {
            await page.goto(link, { waitUntil: 'networkidle2' });
            await this.delay(1000);

            const pageEmails = await this.extractEmailsFromPage(page);

            if (pageEmails.length > 0) {
              foundEmail = pageEmails[0];
              break;
            }
          } catch (err) {
            this.logger.warn(`Error visiting link ${link}: ${err.message}`);
          }
        }

        break; // If the browser successfully launches, exit the retry loop

      } catch (err) {
        this.logger.error(`Error launching browser: ${err.message}`);
        retryCount++;

        if (retryCount >= maxRetries) {
          this.logger.error('Max retries for browser launch reached, aborting...');
          break;
        } else {
          this.logger.warn(`Retrying browser launch... (${retryCount}/${maxRetries})`);
        }

      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    return foundEmail;
  }

  private async extractLinksFromPage(page, baseUrl: string): Promise<string[]> {
    try {
      const links = await page.evaluate(() => {
        const anchorElements = document.querySelectorAll('a[href]');
        return Array.from(anchorElements)
          .map(anchor => anchor.getAttribute('href'))
          .filter(href => href);
      });

      const uniqueLinks = new Set<string>();
      for (let link of links) {
        if (link.startsWith('/')) {
          link = new URL(link, baseUrl).href;
        }
        if (link.startsWith('http') || link.startsWith('https')) {
          uniqueLinks.add(link);
        }
      }

      return Array.from(uniqueLinks);
    } catch (err) {
      this.logger.error(`Error extracting links: ${err.message}`);
      return [];
    }
  }

  private async extractEmailsFromPage(page): Promise<string[]> {
    try {
      const emails = await page.evaluate(() => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const bodyText = document.body.innerText;
        return Array.from(new Set(bodyText.match(emailRegex) || []));
      });
      return emails;
    } catch (err) {
      this.logger.error(`Error extracting emails: ${err.message}`);
      return [];
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

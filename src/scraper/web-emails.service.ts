import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require("puppeteer-extra-plugin-stealth");


@Injectable()
export class WebEmailsService {
    private readonly logger = new Logger(WebEmailsService.name);
    constructor() { puppeteer.use(StealthPlugin());}

    async scrapeEmailsFromWebsite(url: string): Promise<string | null> { 
        let foundEmail: string | null = null; 

        const browser= await puppeteer.launch({protocolTimeout: 20000, headless: true,
          args: [
            '--disable-gpu',
            '--no-sandbox',
            '--headless'
          ]});
        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (['image', 'stylesheet'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });
        
        try {
            await page.setDefaultNavigationTimeout(20000);
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
                    
                }
            }
        } catch (err) {
            
        } finally {
            await browser.close();
        }

        
        return foundEmail; // Return found email or null if no email is found
    }

    private async extractLinksFromPage(page, baseUrl: string): Promise<string[]> {
        try {
            const links = await page.evaluate(() => {
                const anchorElements = document.querySelectorAll('a[href]');
                return Array.from(anchorElements)
                    .map(anchor => anchor.getAttribute('href'))
                    .filter(href => href); // Keep only non-null hrefs
            });

            // Process links to handle both absolute and relative URLs
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
            return [];
        }
    }

    private async extractEmailsFromPage(page): Promise<string[]> {
        try {
            const emails = await page.evaluate(() => {
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const bodyText = document.body.innerText;
                return Array.from(new Set(bodyText.match(emailRegex) || [])); // Using Set to ensure unique emails
            });
            return emails;
        } catch (err) {
            this.logger.error(`Error extracting emails in browser context: ${err.message}`);
            return [];
        }
    }

    // Custom delay function
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
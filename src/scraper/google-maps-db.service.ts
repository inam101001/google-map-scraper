import { Injectable } from '@nestjs/common';
import { Database, aql } from 'arangojs';

@Injectable()
export class GoogleMapsDbService {
  private db: Database;

  constructor() {
    this.db = new Database({
        url: "http://34.30.72.6:8529/", 
        databaseName: "scraper_db", 
        auth: { username: "root", password: "x3a2e6X9Qfp6iDNm" },
    });
  }

  async fetchNextQuery(): Promise<any> {
    try {
      const queryCollection = this.db.collection('QUERIES');
  
      const query = await this.db.query(aql`
        FOR q IN ${queryCollection}
        FILTER q.status == null
        LIMIT 1
        UPDATE q WITH { status: false } IN ${queryCollection}
        RETURN NEW
      `);
  
      const [nextQuery] = await query.all();
      return nextQuery; // Return the next available query
    } catch (error) {
      console.error('Error fetching next query:', error);
      throw new Error('Failed to fetch next query');
    }
  }
  
  async updateQueryStatus(queryId: string, status: boolean): Promise<void> {
    try {
      const queryCollection = this.db.collection('QUERIES');
  
      await this.db.query(aql`
        UPDATE { _key: ${queryId} } WITH { status: ${status} } IN ${queryCollection}
      `);
    } catch (error) {
      console.error('Error updating query status:', error);
      throw new Error('Failed to update query status');
    }
  }
  async seedServiceData(services: any[], collectionName: string, newLocation: string[]): Promise<string> {
    try {
      const collection = this.db.collection(collectionName);

      if (!(await collection.exists())) {
        await collection.create();
      }

      for (const service of services) {
        const { phoneNumber, websiteUrl, company, service: newService, email } = service;

        const cursor = await this.db.query(aql`
          FOR doc IN ${collection}
          FILTER doc.phoneNumber == ${phoneNumber} AND doc.websiteUrl == ${websiteUrl}
          RETURN doc
        `);

        const existingDocs = await cursor.all();

        if (existingDocs.length > 0) {
          const existingDoc = existingDocs[0];

          const existingServices = existingDoc.service || [];
          if (!existingServices.includes(newService)) {
            existingServices.push(newService);
          }

          const existingLocation = existingDoc.location || [];
          const locationsToAdd = Array.isArray(newLocation) ? newLocation : [newLocation];

          locationsToAdd.forEach(loc => {
            if (!existingLocation.includes(loc)) {
              existingLocation.push(loc);
            }
          });

          const updatedDoc = {
            ...existingDoc,
            service: existingServices,
            email: email || existingDoc.email, 
            location: existingLocation
          };

          await collection.update(existingDoc._key, updatedDoc);
        } else {
          await collection.save({
            company,
            service: [newService],
            phoneNumber,
            websiteUrl,
            email,
            location: Array.isArray(newLocation) ? newLocation : [newLocation] 
          });
        }
      }

      return 'Seeding process completed successfully.';
    } catch (error) {
      console.error('Error during seeding process:', error);
      throw new Error(`Failed to seed data: ${error.message}`);
    }
  }

}


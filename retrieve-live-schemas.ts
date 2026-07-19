import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const liveDatabases = [
  { name: 'Opportunities', id: '63196202-078b-4179-8cee-96acd6ca3bcb' }
];

async function run() {
  for (const dbInfo of liveDatabases) {
    try {
      const db = await notion.databases.retrieve({ database_id: dbInfo.id });
      console.log(`DB object:`, JSON.stringify(db, null, 2));
    } catch (err: any) {
      console.error(`Failed to retrieve schema for ${dbInfo.name}:`, err.message);
    }
  }
}

run();

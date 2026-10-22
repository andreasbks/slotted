import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { readDatabaseUrl } from "./database-url";

function createClients(url: string) {
  const sql = neon(url);
  return { sql, db: drizzle(sql, { schema }) };
}

let cachedUrl: string | undefined;
let cachedClients: ReturnType<typeof createClients> | undefined;

function client() {
  const url = readDatabaseUrl();
  if (!cachedClients || cachedUrl !== url) {
    cachedUrl = url;
    cachedClients = createClients(url);
  }
  return cachedClients;
}

export function getDb() {
  return client().db;
}

export function getSql() {
  return client().sql;
}

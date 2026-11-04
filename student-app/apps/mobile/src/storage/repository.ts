import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { SessionData } from '../domain/types';
let pending: Promise<SQLiteDatabase> | null = null;
function database() {
  if (!pending) pending = (async () => {
    const db = await openDatabaseAsync('kit-professor-ai.db');
    await db.execAsync('CREATE TABLE IF NOT EXISTS app_session (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL)');
    return db;
  })().catch(error => { pending = null; throw error; });
  return pending;
}
export const repository = {
  async read(): Promise<string | null> {
    const db = await database();
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM app_session WHERE id = 1');
    return row?.payload ?? null;
  },
  async write(session: SessionData): Promise<void> {
    const db = await database();
    await db.runAsync('INSERT INTO app_session (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload', JSON.stringify(session));
  }
};

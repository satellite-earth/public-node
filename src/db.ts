import path from 'path';
import Database, { type Database as TDatabase } from 'better-sqlite3';

import { DATA_PATH } from './env.js';

const db: TDatabase = new Database(path.join(DATA_PATH, 'sqlite.db'));
db.pragma('journal_mode = WAL');

export default db;

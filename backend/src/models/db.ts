import Datastore from '@seald-io/nedb';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function makeDb(name: string) {
  return new Datastore({ filename: path.join(dataDir, `${name}.db`), autoload: true });
}

export const usersDb = makeDb('users');
export const matchesDb = makeDb('matches');
export const shortsDb = makeDb('shorts');
export const messagesDb = makeDb('messages');
export const sessionsDb = makeDb('sessions');
export const reportsDb = makeDb('reports');
export const subscriptionsDb = makeDb('subscriptions');

usersDb.ensureIndex({ fieldName: 'email', unique: true });
matchesDb.ensureIndex({ fieldName: 'userIds' });

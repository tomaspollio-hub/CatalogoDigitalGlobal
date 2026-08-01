import { countSearchesToday } from './db/queries.js';

/**
 * @param {D1Database} db
 * @param {number} dailyLimit
 * @returns {Promise<{ allowed: boolean, usedToday: number, dailyLimit: number }>}
 */
export async function checkDailyLimit(db, dailyLimit) {
  const usedToday = await countSearchesToday(db);
  return { allowed: usedToday < dailyLimit, usedToday, dailyLimit };
}

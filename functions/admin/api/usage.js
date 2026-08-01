import { getUsageStats } from '../../_lib/db/queries.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet(context) {
  const { env } = context;
  const dailyLimit = Number(env.BARCODE_LOOKUP_DAILY_LIMIT || 100);
  const stats = await getUsageStats(env.DB);
  return json({
    ...stats,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - stats.total),
  });
}

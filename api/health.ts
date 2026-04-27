import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/health
 *
 * Lightweight health check endpoint. Point an uptime monitor (UptimeRobot,
 * Better Uptime, etc.) at this URL to get alerted when the deployment is down.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status:    'ok',
    version:   process.env.VITE_APP_VERSION || 'unknown',
    timestamp: new Date().toISOString(),
  });
}

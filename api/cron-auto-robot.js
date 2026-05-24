import { runAutoRobot } from '../services/automationService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Cron Auto Robot Booted Successfully");

export const maxDuration = 300;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Very simple secret protection
  const secret = req.query.secret || req.query.key;
  if (!secret || secret !== process.env.CRON_SECRET) {
    if (process.env.CRON_SECRET) {
       return res.status(401).json({ error: 'Unauthorized. Invalid secret.' });
    } else {
       console.warn("WARNING: CRON_SECRET is not set in environment variables. Anyone can trigger this endpoint.");
    }
  }

  try {
    const result = await runAutoRobot();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Cron Auto Robot Error:", error);
    return res.status(500).json({ 
      status: "error", 
      stage: error.stage || "runAutoRobot_general",
      detailedError: error.message || String(error)
    });
  }
}

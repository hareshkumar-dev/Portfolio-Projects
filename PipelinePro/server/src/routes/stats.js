/**
 * Stats routes.
 *
 * Aggregated pipeline metrics for the dashboard, computed in
 * Salesforce with SOQL aggregate queries so no raw records are
 * transferred.
 */
import { Router } from 'express';

const router = Router();

/**
 * GET /api/stats
 *
 * Returns:
 *  {
 *    pipeline: [{ stage, amount, count }],   // open deals grouped by stage
 *    totals: { openValue, openCount, wonValue, wonCount, winRate }
 *  }
 */
router.get('/', async (req, res) => {
  try {
    const [byStage, won, closed] = await Promise.all([
      req.sf.query(`
        SELECT StageName stage, SUM(Amount) amount, COUNT(Id) cnt
        FROM Opportunity
        WHERE IsClosed = false
        GROUP BY StageName
      `),
      req.sf.query(`
        SELECT SUM(Amount) amount, COUNT(Id) cnt
        FROM Opportunity
        WHERE IsWon = true
      `),
      req.sf.query(`
        SELECT COUNT(Id) cnt
        FROM Opportunity
        WHERE IsClosed = true
      `),
    ]);

    const pipeline = byStage.records.map((r) => ({
      stage: r.stage,
      amount: r.amount || 0,
      count: r.cnt || 0,
    }));

    const wonValue = won.records[0]?.amount || 0;
    const wonCount = won.records[0]?.cnt || 0;
    const closedCount = closed.records[0]?.cnt || 0;

    res.json({
      pipeline,
      totals: {
        openValue: pipeline.reduce((sum, p) => sum + p.amount, 0),
        openCount: pipeline.reduce((sum, p) => sum + p.count, 0),
        wonValue,
        wonCount,
        winRate: closedCount ? Math.round((wonCount / closedCount) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

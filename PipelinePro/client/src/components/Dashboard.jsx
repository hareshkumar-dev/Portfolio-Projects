import { useEffect, useState } from 'react';
import { fetchStats, formatMoney, getSession } from '../api.js';

// Funnel order for the chart; stages not listed are appended as found.
const STAGE_ORDER = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
];

// Ordinal blue ramp (validated: monotone lightness, light end clears
// the surface). Earlier funnel stages are lighter, later stages darker.
const RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

/** Round an axis maximum up to a clean number (1/2/5 × 10^n) */
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 5, 10]) {
    if (value <= m * pow) return m * pow;
  }
  return 10 * pow;
}

export default function Dashboard({ onSessionExpired }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null); // index of hovered bar

  useEffect(() => {
    (async () => {
      try {
        setStats(await fetchStats());
      } catch (err) {
        if (!getSession()) return onSessionExpired();
        setError(err.message);
      }
    })();
  }, [onSessionExpired]);

  if (error) return <div className="error-box">{error}</div>;
  if (!stats) return <div className="empty">Loading dashboard…</div>;

  const { totals } = stats;

  // Order stages by funnel position; unknown stages go to the end
  const pipeline = [...stats.pipeline].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a.stage);
    const ib = STAGE_ORDER.indexOf(b.stage);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const axisMax = niceMax(Math.max(...pipeline.map((p) => p.amount), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * axisMax);
  const rampFor = (i) => RAMP[Math.min(i, RAMP.length - 1)];

  const tiles = [
    { label: 'Open pipeline', value: formatMoney(totals.openValue) },
    { label: 'Won revenue', value: formatMoney(totals.wonValue) },
    { label: 'Open deals', value: totals.openCount },
    { label: 'Win rate', value: `${totals.winRate}%` },
  ];

  return (
    <div>
      <div className="kpi-row">
        {tiles.map((t) => (
          <div className="stat-tile" key={t.label}>
            <div className="stat-label">{t.label}</div>
            <div className="stat-value">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="card-title">Open pipeline by stage</h2>

        {pipeline.length === 0 ? (
          <div className="empty">
            No open deals yet. Add your first deal on the <b>Pipeline</b> tab.
          </div>
        ) : (
          <>
            <div className="chart">
              {pipeline.map((p, i) => (
                <div
                  className="chart-row"
                  key={p.stage}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="chart-cat">{p.stage}</div>
                  <div className="chart-track">
                    {/* gridlines */}
                    {ticks.slice(1).map((t) => (
                      <span
                        key={t}
                        className="chart-grid"
                        style={{ left: `${(t / axisMax) * 100}%` }}
                      />
                    ))}
                    <div
                      className="chart-bar"
                      style={{
                        width: `${(p.amount / axisMax) * 100}%`,
                        background: rampFor(i),
                      }}
                    />
                    <span
                      className="chart-value"
                      style={{ left: `calc(${(p.amount / axisMax) * 100}% + 8px)` }}
                    >
                      {formatMoney(p.amount)}
                    </span>
                    {hover === i && (
                      <div className="chart-tip">
                        <b>{p.stage}</b>
                        <span>${Number(p.amount).toLocaleString()}</span>
                        <span>{p.count} deal{p.count === 1 ? '' : 's'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* axis */}
              <div className="chart-row chart-axis-row">
                <div className="chart-cat" />
                <div className="chart-track chart-axis">
                  {ticks.map((t) => (
                    <span
                      key={t}
                      className="chart-tick"
                      style={{ left: `${(t / axisMax) * 100}%` }}
                    >
                      {formatMoney(t)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <details className="chart-table">
              <summary>View as table</summary>
              <table>
                <thead>
                  <tr><th>Stage</th><th>Value</th><th>Deals</th></tr>
                </thead>
                <tbody>
                  {pipeline.map((p) => (
                    <tr key={p.stage}>
                      <td>{p.stage}</td>
                      <td>${Number(p.amount).toLocaleString()}</td>
                      <td>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

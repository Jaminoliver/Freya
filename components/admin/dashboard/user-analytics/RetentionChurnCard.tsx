"use client";

const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const retentionData = [88.2, 89.1, 90.4, 89.8, 91.2, 92.6, 93.9];
const churnData =     [11.8, 10.9,  9.6, 10.2,  8.8,  7.4,  6.1];

export default function RetentionChurnCard() {
  const maxR = Math.max(...retentionData);
  const maxC = Math.max(...churnData);

  return (
    <div className="card">
      <div className="card-title">Retention & Churn</div>

      <div className="metrics-row">
        <div className="metric">
          <div className="metric-val green">93.9%</div>
          <div className="metric-label">Retention Rate</div>
          <div className="metric-change green">↑ +0.8% vs last month</div>
        </div>
        <div className="divider" />
        <div className="metric">
          <div className="metric-val amber">6.1%</div>
          <div className="metric-label">Churn Rate</div>
          <div className="metric-change green">↓ -0.8% vs last month</div>
        </div>
        <div className="divider" />
        <div className="metric">
          <div className="metric-val purple">1,204</div>
          <div className="metric-label">Cancelled This Month</div>
          <div className="metric-change green">↓ -12% vs last month</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-label">Retention Rate — Last 7 months</div>
        <div className="bar-chart">
          {retentionData.map((v, i) => (
            <div key={i} className="bar-col">
              <div className="bar-val">{v}%</div>
              <div className="bar-track">
                <div className="bar-fill green" style={{ height: `${(v / maxR) * 100}%` }} />
              </div>
              <div className="bar-label">{months[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-label">Churn Rate — Last 7 months</div>
        <div className="bar-chart">
          {churnData.map((v, i) => (
            <div key={i} className="bar-col">
              <div className="bar-val">{v}%</div>
              <div className="bar-track">
                <div className="bar-fill amber" style={{ height: `${(v / maxC) * 100}%` }} />
              </div>
              <div className="bar-label">{months[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .card {
          background: #fff; border: 1px solid #eeecf8; border-radius: 16px;
          padding: 20px; flex: 1; min-width: 0; box-sizing: border-box;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; margin-bottom: 16px; }
        .metrics-row { display: flex; gap: 0; margin-bottom: 20px; }
        .metric { flex: 1; padding: 0 16px; text-align: center; }
        .metric:first-child { padding-left: 0; }
        .metric-val { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .metric-val.green { color: #16a34a; }
        .metric-val.amber { color: #d97706; }
        .metric-val.purple { color: #7c3aed; }
        .metric-label { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        .metric-change { font-size: 11.5px; font-weight: 600; margin-top: 4px; }
        .metric-change.green { color: #16a34a; }
        .divider { width: 1px; background: #f3f4f6; flex-shrink: 0; }
        .chart-section { margin-top: 16px; }
        .chart-label { font-size: 12px; color: #9b9aaa; font-weight: 500; margin-bottom: 8px; }
        .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
        .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
        .bar-val { font-size: 9px; color: #9b9aaa; margin-bottom: 3px; }
        .bar-track {
          flex: 1; width: 100%; background: #f3f4f6; border-radius: 4px;
          display: flex; align-items: flex-end; overflow: hidden;
        }
        .bar-fill {
          width: 100%; border-radius: 4px;
          transition: height 1s cubic-bezier(0.4,0,0.2,1);
        }
        .bar-fill.green { background: #10b981; }
        .bar-fill.amber { background: #f59e0b; }
        .bar-label { font-size: 10px; color: #9b9aaa; margin-top: 4px; }
      `}</style>
    </div>
  );
}
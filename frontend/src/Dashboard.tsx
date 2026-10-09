import React, { useEffect, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, DollarSign, Target, Clock, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import './Dashboard.css';

interface Portfolio {
  id: string;
  allocatedCapital: number;
  availableCash: number;
  unrealizedPnl: number;
  totalPnl: number;
}

interface Position {
  id: string;
  instrument: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

interface Order {
  id: string;
  action: string;
  status: string;
  requestedSize: number;
  executedQuantity: number;
  executionPrice: number | null;
  timestamp: string;
  rule?: {
    indicator: string;
    timeframe: string;
    condition: string;
    orderSize?: number;
  };
}

export function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Mock data for the chart since we don't have historical PnL tracking yet
  const mockChartData = [
    { time: '10:00', value: 1000 },
    { time: '11:00', value: 1005 },
    { time: '12:00', value: 998 },
    { time: '13:00', value: 1012 },
    { time: '14:00', value: 1025 },
    { time: '15:00', value: 1018 },
    { time: '16:00', value: 1040 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stratRes = await fetch('http://localhost:3000/api/strategies');
        const strategies = await stratRes.json();
        
        let allPositions: Position[] = [];
        let allOrders: Order[] = [];
        let latestPort: Portfolio | null = null;
        
        if (strategies.length > 0) {
          // Flatten orders and positions from all strategies
          strategies.forEach((s: any) => {
            if (s.positions) allPositions.push(...s.positions);
            if (s.orders) allOrders.push(...s.orders);
          });
          
          // Sort orders by time
          allOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setPositions(allPositions);
          setOrders(allOrders.slice(0, 30)); // Top 30 recent orders
          
          // Get the portfolio of the most recent strategy
          const latestStrat = strategies[0];
          if (latestStrat?.portfolioId) {
            const portRes = await fetch(`http://localhost:3000/api/portfolios/${latestStrat.portfolioId}`);
            latestPort = await portRes.json();
            setPortfolio(latestPort);
          }
        }
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddFunds = async () => {
    if (!portfolio) {
      alert("Please create a strategy first to initialize your portfolio!");
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/api/portfolios/${portfolio.id}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000 })
      });
      if (res.ok) {
        const updated = await res.json();
        setPortfolio(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Terminal Dashboard</h1>
          <p>Real-time analytics and portfolio performance</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn" onClick={handleAddFunds} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-text)', fontWeight: 'bold' }}>
            + $1000 Add Funds
          </button>
          <div className="status-badge">
            <Activity size={16} /> System Active
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrapper blue">
            <DollarSign size={24} />
          </div>
          <div className="metric-details">
            <h3>Total Capital</h3>
            <div className="metric-value">
              ${(portfolio?.allocatedCapital || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper green">
            <Layers size={24} />
          </div>
          <div className="metric-details">
            <h3>Available Cash</h3>
            <div className="metric-value">
              ${(portfolio?.availableCash || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className={`metric-icon-wrapper ${(portfolio?.totalPnl || 0) >= 0 ? 'green' : 'red'}`}>
            {(portfolio?.totalPnl || 0) >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
          </div>
          <div className="metric-details">
            <h3>Total PnL</h3>
            <div className={`metric-value ${(portfolio?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
              ${(portfolio?.totalPnl || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper purple">
            <Target size={24} />
          </div>
          <div className="metric-details">
            <h3>Active Positions</h3>
            <div className="metric-value">{positions.length}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        {/* Chart Section */}
        <div className="chart-section glass-panel">
          <h3>Portfolio Performance</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4ff00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4ff00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#d4ff00" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables Section */}
        <div className="tables-section">
          <div className="glass-panel table-panel">
            <h3>Open Positions</h3>
            {positions.length === 0 ? (
              <div className="empty-state">No open positions</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Size</th>
                    <th>Entry Price</th>
                    <th>Unrealized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.instrument}</strong></td>
                      <td>{p.quantity.toFixed(4)}</td>
                      <td>${p.averagePrice.toFixed(2)}</td>
                      <td className={p.unrealizedPnl >= 0 ? 'positive' : 'negative'}>
                        ${p.unrealizedPnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="glass-panel table-panel">
            <h3>Recent Orders</h3>
            {orders.length === 0 ? (
              <div className="empty-state">No recent orders</div>
            ) : (
            <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td><Clock size={12} className="inline-icon"/> {new Date(o.timestamp).toLocaleTimeString()}</td>
                      <td className={o.action === 'BUY' ? 'positive' : 'negative'}>
                        {o.action}
                        {o.rule && <span style={{fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px'}}>
                          {o.rule.indicator} ({o.rule.timeframe})
                        </span>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          ${o.requestedSize.toFixed(2)}
                        </span>
                        {o.rule ? (
                          <span style={{fontSize: '10px', color: 'var(--text-muted)', display: 'block'}}>
                            ({o.rule.orderSize}% of {o.action === 'BUY' ? 'balance' : 'position'})
                          </span>
                        ) : null}
                      </td>
                      <td><span className={`status-tag ${o.status.toLowerCase()}`}>{o.status}</span></td>
                      <td>{o.executionPrice ? `$${o.executionPrice.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Play, Square, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Strategy {
  id: string;
  name: string;
  instrument: string;
  duration: string;
  status: string;
  portfolio: {
    allocatedCapital: number;
    totalPnl: number;
  };
  rules: any[];
}
import { API_BASE_URL } from './config';

export function Strategies() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/strategies`);
        setStrategies(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchStrategies();
    const interval = setInterval(fetchStrategies, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Saved Strategies</h1>
          <p>Manage and monitor your active trading bots</p>
        </div>
      </div>

      <div className="tables-section" style={{ gridTemplateColumns: '1fr' }}>
        <div className="glass-panel table-panel">
          {strategies.length === 0 ? (
            <div className="empty-state">No strategies found. Go to Builder to create one.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Instrument</th>
                  <th>Status</th>
                  <th>Capital</th>
                  <th>Total PnL</th>
                  <th>Rules Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name || 'Unnamed'}</strong></td>
                    <td>{s.instrument}</td>
                    <td>
                      <span className={`status-tag ${s.status === 'Running' ? 'filled' : 'pending'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>${s.portfolio?.allocatedCapital.toFixed(2)}</td>
                    <td className={(s.portfolio?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}>
                      ${(s.portfolio?.totalPnl || 0).toFixed(2)}
                    </td>
                    <td>{s.rules.length}</td>
                    <td>
                      <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => navigate('/builder', { state: { editStrategy: s } })}>
                        <Edit size={12} className="inline-icon" /> Edit
                      </button>
                      {s.status === 'Draft' || s.status === 'Stopped' ? (
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Play size={12} className="inline-icon" /> Start
                        </button>
                      ) : (
                        <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          <Square size={12} className="inline-icon" /> Stop
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

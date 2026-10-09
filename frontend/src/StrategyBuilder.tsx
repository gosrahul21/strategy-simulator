import React, { useState } from 'react';
import { Plus, ArrowRight, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './index.css';

interface Rule {
  id: string;
  timeframe: string;
  indicator: string;
  condition: string;
  action: string;
  orderSize: number;
}

export function StrategyBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const editStrategy = location.state?.editStrategy;
  const editId = editStrategy?.id;

  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({
    name: editStrategy?.name || '',
    instrument: editStrategy?.instrument || 'BTCUSDT',
    duration: editStrategy?.duration || '1M',
    portfolioCapital: editStrategy?.portfolio?.allocatedCapital || 1000,
  });
  
  const initialTimeframes = editStrategy 
    ? Array.from(new Set(editStrategy.rules.map((r: any) => r.timeframe))) as string[]
    : ['5m', '15m', '1h', '4h', '1d'];
  const [timeframes, setTimeframes] = useState<string[]>(initialTimeframes);
  
  const [rules, setRules] = useState<Rule[]>(() => editStrategy 
    ? editStrategy.rules.map((r: any) => ({
        id: r.id || Math.random().toString(36).substr(2, 9),
        timeframe: r.timeframe, indicator: r.indicator, condition: r.condition, action: r.action, orderSize: r.orderSize
      }))
    : [
    { id: 'buy_bb_5m', timeframe: '5m', indicator: 'BollingerBands', condition: 'lower_band_hit', action: 'BUY', orderSize: 5 },
    { id: 'buy_bb_15m', timeframe: '15m', indicator: 'BollingerBands', condition: 'lower_band_hit', action: 'BUY', orderSize: 10 },
    { id: 'buy_bb_1h', timeframe: '1h', indicator: 'BollingerBands', condition: 'lower_band_hit', action: 'BUY', orderSize: 20 },
    { id: 'buy_bb_4h', timeframe: '4h', indicator: 'BollingerBands', condition: 'lower_band_hit', action: 'BUY', orderSize: 30 },
    { id: 'buy_bb_1d', timeframe: '1d', indicator: 'BollingerBands', condition: 'lower_band_hit', action: 'BUY', orderSize: 50 },

    { id: 'sell_bb_5m', timeframe: '5m', indicator: 'BollingerBands', condition: 'upper_band_hit', action: 'SELL', orderSize: 5 },
    { id: 'sell_bb_15m', timeframe: '15m', indicator: 'BollingerBands', condition: 'upper_band_hit', action: 'SELL', orderSize: 10 },
    { id: 'sell_bb_1h', timeframe: '1h', indicator: 'BollingerBands', condition: 'upper_band_hit', action: 'SELL', orderSize: 20 },
    { id: 'sell_bb_4h', timeframe: '4h', indicator: 'BollingerBands', condition: 'upper_band_hit', action: 'SELL', orderSize: 30 },
    { id: 'sell_bb_1d', timeframe: '1d', indicator: 'BollingerBands', condition: 'upper_band_hit', action: 'SELL', orderSize: 50 },

    { id: 'sell_sup_5m', timeframe: '5m', indicator: 'SupportResistance', condition: 'support_break', action: 'SELL', orderSize: 5 },
    { id: 'sell_sup_15m', timeframe: '15m', indicator: 'SupportResistance', condition: 'support_break', action: 'SELL', orderSize: 10 },
    { id: 'sell_sup_1h', timeframe: '1h', indicator: 'SupportResistance', condition: 'support_break', action: 'SELL', orderSize: 20 }
  ]);

  const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const toggleTimeframe = (tf: string) => {
    setTimeframes(prev => 
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
    );
  };

  const addRule = () => {
    setRules([...rules, {
      id: Math.random().toString(36).substr(2, 9),
      timeframe: timeframes[0] || '5m',
      indicator: 'RSI',
      condition: 'oversold',
      action: 'BUY',
      orderSize: 50
    }]);
  };

  const updateRule = (id: string, field: keyof Rule, value: any) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const submitStrategy = async () => {
    try {
      const payload = {
        ...details,
        rules: rules.map(r => ({
          timeframe: r.timeframe,
          indicator: r.indicator,
          condition: r.condition,
          action: r.action,
          orderSize: r.orderSize
        }))
      };
      
      const url = editId ? `http://localhost:3000/api/strategies/${editId}` : 'http://localhost:3000/api/strategies';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save strategy');
      
      const strategy = await res.json();
      
      if (!editId) {
        await fetch(`http://localhost:3000/api/strategies/${strategy.id}/start`, { method: 'POST' });
      }
      
      alert(editId ? 'Strategy Updated Successfully!' : 'Strategy Created & Started Successfully!');
      navigate('/strategies');
    } catch (err) {
      console.error(err);
      alert('Error saving strategy');
    }
  };

  return (
    <div className="app-container">
        <div className="header">
        <h1>Strategy Builder</h1>
        <p>Design your quantitative trading edge</p>
      </div>

      <div className="stepper">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
      </div>

      <div className="glass-panel">
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '24px' }}>Strategy Details</h2>
            <div className="input-group">
              <label>Strategy Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Mean Reversion Bot"
                value={details.name}
                onChange={e => setDetails({...details, name: e.target.value})}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Instrument</label>
                <select 
                  className="select"
                  value={details.instrument}
                  onChange={e => setDetails({...details, instrument: e.target.value})}
                >
                  <option value="BTCUSDT">BTCUSDT</option>
                  <option value="ETHUSDT">ETHUSDT</option>
                  <option value="SOLUSDT">SOLUSDT</option>
                  <option value="PAXGUSDT">PAXGUSDT</option>
                </select>
              </div>
              <div className="input-group">
                <label>Duration</label>
                <select 
                  className="select"
                  value={details.duration}
                  onChange={e => setDetails({...details, duration: e.target.value})}
                >
                  <option value="1W">1 Week</option>
                  <option value="1M">1 Month</option>
                  <option value="3M">3 Months</option>
                  <option value="Continuous">Continuous</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Allocated Capital (USDT)</label>
              <input 
                type="number" 
                className="input" 
                value={details.portfolioCapital}
                onChange={e => setDetails({...details, portfolioCapital: Number(e.target.value)})}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '24px' }}>Select Timeframes</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Select all the timeframes your rules will evaluate against.</p>
            <div className="timeframe-grid">
              {availableTimeframes.map(tf => (
                <div 
                  key={tf}
                  className={`timeframe-card ${timeframes.includes(tf) ? 'selected' : ''}`}
                  onClick={() => toggleTimeframe(tf)}
                >
                  {tf}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '24px' }}>Rule Builder</h2>
            
            {rules.map((rule, idx) => (
              <div key={rule.id} className="rule-card">
                <div className="rule-header">
                  <span style={{ fontWeight: 'bold' }}>Rule #{idx + 1}</span>
                  <button className="remove-btn" onClick={() => removeRule(rule.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Timeframe</label>
                  <select 
                    className="select" 
                    value={rule.timeframe}
                    onChange={(e) => updateRule(rule.id, 'timeframe', e.target.value)}
                  >
                    {timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Indicator</label>
                  <select 
                    className="select"
                    value={rule.indicator}
                    onChange={(e) => updateRule(rule.id, 'indicator', e.target.value)}
                  >
                    <option value="RSI">RSI</option>
                    <option value="BollingerBands">Bollinger Bands</option>
                    <option value="SupportResistance">Support & Resistance</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Condition</label>
                  <select 
                    className="select"
                    value={rule.condition}
                    onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                  >
                    {rule.indicator === 'RSI' ? (
                      <>
                        <option value="oversold">Oversold (&lt;30)</option>
                        <option value="overbought">Overbought (&gt;70)</option>
                      </>
                    ) : rule.indicator === 'BollingerBands' ? (
                      <>
                        <option value="lower_band_hit">Hit Lower Band</option>
                        <option value="upper_band_hit">Hit Upper Band</option>
                      </>
                    ) : (
                      <>
                        <option value="support_bounce">Bounce at Support</option>
                        <option value="support_break">Break Support</option>
                        <option value="resistance_reject">Reject at Resistance</option>
                        <option value="resistance_break">Break Resistance</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Action</label>
                  <select 
                    className="select"
                    value={rule.action}
                    onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Size (%)</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="1"
                    max="100"
                    value={rule.orderSize}
                    onChange={(e) => updateRule(rule.id, 'orderSize', Math.min(100, Math.max(1, Number(e.target.value))))}
                  />
                </div>
              </div>
            ))}

            <div className="add-rule-placeholder" onClick={addRule}>
              <Plus size={24} style={{ marginBottom: '8px' }} />
              <div>Add New Rule</div>
            </div>
          </div>
        )}

        <div className="flex-between">
          <button 
            className="btn secondary" 
            onClick={handlePrev}
            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          {step < 3 ? (
            <button className="btn" onClick={handleNext}>
              Next Step <ArrowRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '16px' }}>
              {editId && (
                <button className="btn secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                  if (confirm('Are you sure you want to delete this strategy?')) {
                    await fetch(`http://localhost:3000/api/strategies/${editId}`, { method: 'DELETE' });
                    navigate('/strategies');
                  }
                }}>
                  <Trash2 size={16} style={{marginRight: '8px'}} /> Delete
                </button>
              )}
              <button className="btn" onClick={submitStrategy}>
                <Save size={16} style={{marginRight: '8px'}} /> Save Strategy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

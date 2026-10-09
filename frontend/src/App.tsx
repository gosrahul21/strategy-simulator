import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings2, Layers, Sun, Moon } from 'lucide-react';
import { Ticker } from './Ticker';
import { Dashboard } from './Dashboard';
import { StrategyBuilder } from './StrategyBuilder';
import { Strategies } from './Strategies';
import './index.css';

function App() {
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    if (lightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [lightMode]);

  return (
    <BrowserRouter>
      <Ticker />
      <div className="main-layout">
        <nav className="side-nav">
          <div className="nav-brand">
            <Settings2 color="var(--primary)" size={28} />
            <span>AlgoTrade</span>
          </div>
          <div className="nav-links">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/strategies" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              <Layers size={20} /> Strategies
            </NavLink>
            <NavLink to="/builder" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              <Settings2 size={20} /> Builder
            </NavLink>
          </div>
          
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => setLightMode(!lightMode)} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {lightMode ? <Moon size={18} /> : <Sun size={18} />}
              {lightMode ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </nav>
        
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/builder" element={<StrategyBuilder />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

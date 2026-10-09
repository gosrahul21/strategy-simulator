import { useEffect, useState } from 'react';
import './Ticker.css';

interface TickerData {
  symbol: string;
  price: string;
  change: number;
}

export const Ticker = () => {
  const [tickers, setTickers] = useState<TickerData[]>([]);

  useEffect(() => {
    
    // Initial fetch to get prices immediately without waiting for websocket
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","PAXGUSDT"]`)
      .then(res => res.json())
      .then(data => {
        const initial = data.map((d: any) => ({
          symbol: d.symbol,
          price: parseFloat(d.lastPrice).toFixed(2),
          change: parseFloat(d.priceChangePercent)
        }));
        setTickers(initial);
      });

    // WebSocket for live updates
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTickers(prev => {
        const updated = [...prev];
        data.forEach((ticker: any) => {
          const index = updated.findIndex(t => t.symbol === ticker.s);
          if (index !== -1) {
            updated[index] = {
              symbol: ticker.s,
              price: parseFloat(ticker.c).toFixed(2),
              change: parseFloat(ticker.P)
            };
          }
        });
        return updated;
      });
    };

    return () => ws.close();
  }, []);

  if (tickers.length === 0) return null;

  // Duplicate the array multiple times to create a seamless infinite marquee
  const repeatedTickers = [...tickers, ...tickers, ...tickers, ...tickers];

  return (
    <div className="ticker-container">
      <div className="ticker-track">
        {repeatedTickers.map((t, idx) => (
          <div key={idx} className="ticker-item">
            <span className="ticker-symbol">{t.symbol}</span>
            <span className="ticker-price">${t.price}</span>
            <span className={`ticker-change ${t.change >= 0 ? 'positive' : 'negative'}`}>
              {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

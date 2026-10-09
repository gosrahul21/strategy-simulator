import axios from 'axios';
import { Candle, Timeframe } from '../types/market-data';

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com/fapi/v1';

export class BinanceService {
  /**
   * Fetches the latest klines (candlesticks) from Binance Futures
   */
  async getKlines(symbol: string, interval: Timeframe, limit: number = 100): Promise<Candle[]> {
    try {
      const response = await axios.get(`${BINANCE_FUTURES_API_URL}/klines`, {
        params: {
          symbol,
          interval,
          limit
        }
      });

      return response.data.map((candleData: any[]) => this.formatCandle(candleData, symbol, interval));
    } catch (error) {
      console.error(`Error fetching klines for ${symbol} at ${interval}:`, error);
      throw error;
    }
  }

  private formatCandle(data: any[], symbol: string, timeframe: string): Candle {
    return {
      openTime: data[0],
      open: parseFloat(data[1]),
      high: parseFloat(data[2]),
      low: parseFloat(data[3]),
      close: parseFloat(data[4]),
      volume: parseFloat(data[5]),
      closeTime: data[6],
      // For historical data we consider it closed. For the real-time last candle, it might not be closed.
      // We will handle 'isClosed' logic in the polling service by checking the closeTime vs current time.
      isClosed: Date.now() > data[6], 
      timeframe,
      symbol
    };
  }
}

export const binanceService = new BinanceService();

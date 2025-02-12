from flask import Flask, render_template, jsonify
import yfinance as yf
import numpy as np
from datetime import datetime, timedelta
import pandas as pd

app = Flask(__name__)

class AITradingAgent:
    def __init__(self):
        self.portfolio = {"cash": 100000, "positions": {}}
        self.trade_history = []
    
    def analyze_market(self, symbol, data):
        # Simple moving average strategy
        short_window = 10
        long_window = 30
        
        signals = pd.DataFrame(index=data.index)
        signals['price'] = data['Close']
        signals['short_mavg'] = data['Close'].rolling(window=short_window).mean()
        signals['long_mavg'] = data['Close'].rolling(window=long_window).mean()
        
        # Generate trading signals
        signals['signal'] = 0.0
        signals['signal'][short_window:] = np.where(
            signals['short_mavg'][short_window:] > signals['long_mavg'][short_window:], 1.0, -1.0
        )
        
        return signals
    
    def execute_trade(self, symbol, price, signal):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if signal > 0 and self.portfolio["cash"] >= price * 100:  # Buy 100 shares
            shares = 100
            cost = price * shares
            self.portfolio["cash"] -= cost
            self.portfolio["positions"][symbol] = self.portfolio["positions"].get(symbol, 0) + shares
            self.trade_history.append({
                "timestamp": timestamp,
                "action": "BUY",
                "symbol": symbol,
                "shares": shares,
                "price": price,
                "total": cost
            })
        elif signal < 0 and self.portfolio["positions"].get(symbol, 0) >= 100:  # Sell 100 shares
            shares = 100
            revenue = price * shares
            self.portfolio["cash"] += revenue
            self.portfolio["positions"][symbol] -= shares
            self.trade_history.append({
                "timestamp": timestamp,
                "action": "SELL",
                "symbol": symbol,
                "shares": shares,
                "price": price,
                "total": revenue
            })

agent = AITradingAgent()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/portfolio')
def get_portfolio():
    return jsonify(agent.portfolio)

@app.route('/api/history')
def get_history():
    return jsonify(agent.trade_history)

@app.route('/api/market_data/<symbol>')
def get_market_data(symbol):
    stock = yf.Ticker(symbol)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    df = stock.history(start=start_date, end=end_date)
    signals = agent.analyze_market(symbol, df)
    
    # Convert numpy.float64 to Python float and handle NaN values
    prices = [float(x) if not np.isnan(x) else None for x in df['Close'].tolist()]
    short_mavg = [float(x) if not np.isnan(x) else None for x in signals['short_mavg'].tolist()]
    long_mavg = [float(x) if not np.isnan(x) else None for x in signals['long_mavg'].tolist()]
    
    latest_price = float(df['Close'].iloc[-1])
    latest_signal = float(signals['signal'].iloc[-1])
    
    return jsonify({
        'prices': prices,
        'dates': [d.strftime('%Y-%m-%d') for d in df.index],
        'short_mavg': short_mavg,
        'long_mavg': long_mavg,
        'latest_price': latest_price,
        'latest_signal': latest_signal
    })

if __name__ == '__main__':
    app.run(debug=True)
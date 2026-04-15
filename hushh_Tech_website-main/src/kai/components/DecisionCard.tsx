import React, { useEffect, useState } from 'react';
import { DecisionCardData } from '../types';

interface DecisionCardProps {
  data: DecisionCardData;
  onClose: () => void;
  onRequestNews?: (ticker: string) => void;
}

const DecisionCard: React.FC<DecisionCardProps> = ({ data, onClose, onRequestNews }) => {
  const [visible, setVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(data.current_price || "");
  const [priceColor, setPriceColor] = useState("text-gray-100");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (data.current_price) setDisplayPrice(data.current_price);
    setIsSearching(false);
  }, [data.current_price, data.evidence]);

  // Live Price Simulation Effect
  useEffect(() => {
    if (!data.current_price) return;
    const cleanPrice = data.current_price.replace(/[^0-9.-]/g, "");
    const baseValue = parseFloat(cleanPrice);
    if (isNaN(baseValue)) return;

    const interval = setInterval(() => {
      const noise = (Math.random() - 0.5) * 0.002 * baseValue;
      const newValue = baseValue + noise;
      setDisplayPrice(prev => {
        const prevVal = parseFloat(prev.replace(/[^0-9.-]/g, "") || "0");
        if (newValue > prevVal) {
          setPriceColor("text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-colors duration-300");
        } else if (newValue < prevVal) {
          setPriceColor("text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)] transition-colors duration-300");
        }
        setTimeout(() => setPriceColor("text-gray-100 transition-colors duration-500"), 800);
        return newValue.toFixed(2);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [data.current_price]);

  const handleNewsSearch = () => {
    if (data.ticker_symbol && onRequestNews) {
      setIsSearching(true);
      onRequestNews(data.ticker_symbol);
      setTimeout(() => setIsSearching(false), 8000);
    }
  };

  const getRecColor = (rec: string) => {
    const r = rec.toLowerCase();
    if (r.includes('buy')) return 'text-emerald-400 border-emerald-500/50 bg-emerald-900/20';
    if (r.includes('sell') || r.includes('reduce')) return 'text-rose-400 border-rose-500/50 bg-rose-900/20';
    return 'text-amber-400 border-amber-500/50 bg-amber-900/20';
  };

  const getConfidenceStyle = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
    if (score >= 60) return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]';
    return 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]';
  };

  const persona = data.target_persona || "Everyday Investor";
  const risk = data.risk_alignment || "Moderate";
  const hasTicker = !!data.ticker_symbol && !!data.current_price;
  const isPositive = data.price_change_percentage?.includes('+');
  const changeColor = isPositive ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className={`
      absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
      w-[95%] md:w-[90%] max-w-5xl h-[85vh] max-h-[92vh] flex flex-col
      bg-gray-950/95 backdrop-blur-2xl border border-gray-800 rounded-3xl shadow-2xl z-40
      transition-all duration-700 ease-out font-sans
      ${visible ? 'opacity-100 scale-100 translate-y-[-50%]' : 'opacity-0 scale-95 translate-y-[-40%]'}
    `}>
      {/* Top Bar */}
      <div className="flex-none flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 border-b border-gray-800 bg-gray-900/30 rounded-t-3xl gap-3 sm:gap-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={onClose} 
            className="mr-1 p-2 rounded-full hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors group"
            title="Go Back"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3 pr-4 pl-1.5 py-1.5 rounded-full border bg-blue-950/40 border-blue-500/60 text-blue-100">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Calibrated For</span>
              <span className="text-sm font-bold tracking-wide">{persona}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border bg-gray-900/50 text-blue-400 border-blue-500/50 ml-auto sm:ml-0 self-end sm:self-auto">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Reliability</span>
            <span className="text-sm font-bold">{data.reliability_score}/100</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Hero Section */}
        <div className="p-4 md:p-8 pb-4 flex flex-col lg:flex-row justify-between items-start gap-6 md:gap-8">
          <div className="flex flex-col gap-3 flex-1 w-full">
            <div className="text-gray-400 text-xs md:text-sm font-medium mb-1 flex items-center gap-2">
              <span>Kai Recommendation Engine</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 flex-wrap">
              <div className={`text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight uppercase ${getRecColor(data.recommendation).split(' ')[0]}`}>
                {data.recommendation}
              </div>
              {hasTicker && (
                <div className="flex flex-col bg-gray-900/50 rounded-xl px-4 py-2 md:px-5 md:py-3 border border-gray-800 mb-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest">Market Data</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-xl md:text-2xl font-mono font-bold text-gray-100 tracking-wider">{data.ticker_symbol}</span>
                    <span className={`text-xl md:text-2xl font-mono font-bold transition-all duration-300 ${priceColor}`}>{displayPrice}</span>
                    <span className={`text-base md:text-lg font-bold font-mono ${changeColor}`}>{data.price_change_percentage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full lg:w-auto">
            <div className="flex-1 lg:w-40 bg-gray-900/30 border border-gray-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex justify-between w-full mb-2 items-end">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Confidence</span>
                <span className="text-lg font-mono font-bold text-gray-300">{data.confidence}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
                <div className={`h-full rounded-full ${getConfidenceStyle(data.confidence)} transition-all duration-1000 ease-out`} style={{ width: `${visible ? data.confidence : 0}%` }} />
              </div>
            </div>
            <div className="flex-1 lg:w-48 rounded-xl p-3 border bg-amber-900/20 border-amber-500/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Risk Profile</span>
              </div>
              <div className="text-sm font-bold uppercase mb-1.5 text-amber-200">{risk}</div>
            </div>
          </div>
        </div>

        {/* Three Agents Insights */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/40 p-5 rounded-2xl border border-blue-900/20 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-blue-300 text-xs uppercase tracking-widest font-bold">Fundamental Core</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-light">{data.fundamental_insight}</p>
          </div>
          <div className="bg-gray-900/40 p-5 rounded-2xl border border-purple-900/20 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <h3 className="text-purple-300 text-xs uppercase tracking-widest font-bold">Sentiment Core</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-light">{data.sentiment_insight}</p>
          </div>
          <div className="bg-gray-900/40 p-5 rounded-2xl border border-emerald-900/20 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <h3 className="text-emerald-300 text-xs uppercase tracking-widest font-bold">Valuation Core</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-light">{data.valuation_insight}</p>
          </div>
        </div>

        {/* Debate & Evidence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-gray-800">
          <div className="p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-900/20">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Internal Agent Debate
            </h3>
            <div className="relative pl-6 border-l-2 border-gray-700 italic text-gray-300 text-xs md:text-sm leading-loose">
              <span className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center text-[10px] text-gray-500">"</span>
              {data.debate_digest}
            </div>
          </div>
          <div className="p-4 md:p-8 bg-gray-950">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Artifacts & Sources
              </h3>
              {data.ticker_symbol && (
                <button 
                  onClick={handleNewsSearch}
                  disabled={isSearching}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${isSearching ? 'bg-emerald-900/30 text-emerald-500 cursor-wait' : 'bg-gray-800 hover:bg-emerald-900/50 text-gray-300 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/50'}`}
                >
                  {isSearching ? 'Scanning...' : 'Fetch News'}
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {data.evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-gray-400 transition-colors cursor-default group">
                  <span className="font-mono text-gray-600 group-hover:text-emerald-500">[{idx + 1}]</span>
                  <span className="border-b border-dashed border-gray-800 group-hover:border-gray-500 pb-0.5 group-hover:text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-3xl">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">Generated by Kai Financial Engine</div>
          <button onClick={onClose} className="px-6 py-2 md:px-8 md:py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors rounded-lg shadow-lg">Acknowledge</button>
        </div>
        <div className="text-[8px] md:text-[9px] text-gray-600/70 text-center leading-tight px-4 border-t border-gray-800/50 pt-3">
          DISCLAIMER: This analysis is generated by AI for informational purposes only and does not constitute financial advice.
        </div>
      </div>
    </div>
  );
};

export default DecisionCard;

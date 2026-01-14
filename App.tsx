
import React, { useState, useMemo } from 'react';
import { Asset, OptimizationResults, PortfolioPoint } from './types';
import { generateEfficientFrontier } from './mathUtils';
import { searchTickerData } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Loader2, Target, FileSpreadsheet, Search, Scale, Sparkles, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', ticker: 'IREN', weight: 0.10, expectedReturn: 0.25, volatility: 0.65, dividendYield: 0.00 },
    { id: '2', ticker: 'ASTS', weight: 0.10, expectedReturn: 0.35, volatility: 0.80, dividendYield: 0.00 },
    { id: '3', ticker: 'RKLB', weight: 0.10, expectedReturn: 0.22, volatility: 0.55, dividendYield: 0.00 },
    { id: '4', ticker: 'PLTR', weight: 0.15, expectedReturn: 0.28, volatility: 0.45, dividendYield: 0.00 },
    { id: '5', ticker: 'NBIS', weight: 0.05, expectedReturn: 0.20, volatility: 0.60, dividendYield: 0.00 },
    { id: '6', ticker: 'GOOGL', weight: 0.15, expectedReturn: 0.15, volatility: 0.25, dividendYield: 0.00 },
    { id: '7', ticker: 'AMZN', weight: 0.15, expectedReturn: 0.16, volatility: 0.28, dividendYield: 0.00 },
    { id: '8', ticker: 'RDDT', weight: 0.05, expectedReturn: 0.24, volatility: 0.50, dividendYield: 0.00 },
    { id: '9', ticker: 'MU', weight: 0.10, expectedReturn: 0.18, volatility: 0.40, dividendYield: 0.005 },
    { id: '10', ticker: 'TSLA', weight: 0.05, expectedReturn: 0.20, volatility: 0.52, dividendYield: 0.00 },
  ]);

  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tickerInput, setTickerInput] = useState('');

  const totalWeight = useMemo(() => assets.reduce((sum, a) => sum + a.weight, 0), [assets]);

  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    setAssets(prev => prev.map(a => ({ ...a, weight: a.weight / totalWeight })));
  };

  const equalizeWeights = () => {
    if (assets.length === 0) return;
    const equalWeight = 1 / assets.length;
    setAssets(prev => prev.map(a => ({ ...a, weight: equalWeight })));
  };

  const applyOptimizedWeights = (point: PortfolioPoint) => {
    if (!point.weights || point.weights.length !== assets.length) return;
    setAssets(prev => prev.map((asset, index) => ({
      ...asset,
      weight: point.weights[index]
    })));
  };

  const handleSearchAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput.trim() || searching) return;
    setSearching(true);
    try {
      const data = await searchTickerData(tickerInput);
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        ticker: data.ticker || tickerInput.toUpperCase(),
        weight: 0,
        expectedReturn: data.expectedReturn || 0.15,
        volatility: data.volatility || 0.30,
        dividendYield: data.dividendYield || 0,
      };
      setAssets(prev => [newAsset, ...prev]);
      setTickerInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const updateAsset = (id: string, field: keyof Asset, value: any) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const exportTableFile = () => {
    const headers = ['Ticker', 'Waga %', 'Zwrot %', 'Ryzyko %', 'Dywidenda %'].join('\t');
    const rows = assets.map(a => [
      a.ticker,
      (a.weight * 100).toFixed(2),
      (a.expectedReturn * 100).toFixed(2),
      (a.volatility * 100).toFixed(2),
      (a.dividendYield * 100).toFixed(2)
    ].join('\t')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portfel_markowitz_eksport.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const runOptimization = async () => {
    if (Math.abs(totalWeight - 1) > 0.001) {
      normalizeWeights();
    }
    setLoading(true);
    const size = assets.length;
    const matrix = Array(size).fill(0).map((_, i) => 
      Array(size).fill(0).map((_, j) => i === j ? 1 : 0.35)
    );
    try {
      // Symulacja trwa krótko, ale dajemy Loader dla UX
      setTimeout(() => {
        const res = generateEfficientFrontier(assets, matrix);
        setResults(res);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 pb-20">
      <header className="max-w-7xl mx-auto px-6 pt-12 pb-8 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full">
              <Sparkles className="w-3 h-3 text-white fill-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Markowitz Engine</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-slate-900">
              Portfolio <span className="text-blue-600 italic">Optima</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg max-w-xl leading-snug">
              Matematyczna optymalizacja portfela metodą Markowitza. Obliczanie granicy efektywnej (Efficient Frontier) na bazie 3,000 symulacji.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Lewa kolumna: Zarządzanie aktywami */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Aktywa</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Konfiguracja wag</p>
              </div>
              <button 
                onClick={normalizeWeights} 
                className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100" 
                title="Normalizuj do 100%"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={equalizeWeights} 
                className="bg-slate-50 text-slate-600 py-3 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-100 uppercase tracking-widest"
              >
                <Scale className="w-4 h-4" /> Wyrównaj wagi
              </button>
              <button 
                onClick={exportTableFile} 
                className="bg-slate-50 text-slate-600 py-3 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-100 uppercase tracking-widest"
              >
                <FileSpreadsheet className="w-4 h-4" /> Eksportuj TXT
              </button>
            </div>

            <form onSubmit={handleSearchAndAdd} className="relative mb-8 group">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="Dodaj ticker (np. BTC, NVDA)..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 pl-14 pr-6 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 w-6 h-6 transition-colors" />
              <button 
                type="submit" 
                disabled={searching} 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <div key={asset.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-lg tracking-tight">{asset.ticker}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                        {(asset.expectedReturn * 100).toFixed(0)}% zwrot
                      </span>
                    </div>
                    <button 
                      onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))} 
                      className="text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.001" 
                      value={asset.weight} 
                      onChange={(e) => updateAsset(asset.id, 'weight', parseFloat(e.target.value))} 
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                    />
                    <span className="w-14 text-right font-black text-slate-700 text-xs">{(asset.weight * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suma kapitału</p>
                <p className={`text-3xl font-black ${Math.abs(totalWeight - 1) < 0.01 ? 'text-emerald-500' : 'text-slate-900'}`}>
                  {(totalWeight * 100).toFixed(1)}%
                </p>
              </div>
              <button 
                onClick={runOptimization} 
                disabled={loading || assets.length === 0} 
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl hover:bg-black transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                Optymalizuj
              </button>
            </div>
          </div>
        </section>

        {/* Prawa kolumna: Wykres i Wyniki */}
        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h3 className="text-2xl font-black flex items-center gap-3"><TrendingUp className="text-blue-600" /> Wyniki Symulacji</h3>
              
              {results && (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => applyOptimizedWeights(results.maxSharpePortfolio)}
                    className="flex-1 md:flex-none bg-amber-50 text-amber-700 border border-amber-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3 h-3 fill-current" /> Max Sharpe
                  </button>
                  <button 
                    onClick={() => applyOptimizedWeights(results.minRiskPortfolio)}
                    className="flex-1 md:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-3 h-3 fill-current" /> Min Ryzyko
                  </button>
                </div>
              )}
            </div>

            <div className="h-[450px] w-full bg-slate-50/50 rounded-3xl p-4">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                    <XAxis type="number" dataKey="volatility" tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#94a3b8" fontSize={11} name="Ryzyko" />
                    <YAxis type="number" dataKey="expectedReturn" tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#94a3b8" fontSize={11} name="Zwrot" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-4 border rounded-2xl shadow-2xl text-[10px] font-bold ring-4 ring-slate-50">
                              <p className="text-slate-900 mb-2 border-b pb-1 uppercase tracking-tighter">{d.label || 'Kombinacja Wariancji'}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span className="text-slate-400">ZWROT:</span> <span className="text-blue-600">{(d.expectedReturn * 100).toFixed(2)}%</span>
                                <span className="text-slate-400">RYZYKO:</span> <span className="text-red-500">{(d.volatility * 100).toFixed(2)}%</span>
                                <span className="text-slate-400">SHARPE:</span> <span className="text-slate-900">{d.sharpeRatio.toFixed(3)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Scatter name="Symulacje Monte Carlo" data={results.efficientFrontier} fill="#cbd5e1" opacity={0.3} isAnimationActive={false} />
                    <Scatter name="Twój Portfel" data={[results.userPortfolio]} fill="#2563eb" shape="cross" />
                    <Scatter name="Max Sharpe" data={[results.maxSharpePortfolio]} fill="#f59e0b" shape="diamond" />
                    <Scatter name="Min. Ryzyko" data={[results.minRiskPortfolio]} fill="#10b981" shape="star" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
                  <Target className="w-12 h-12 opacity-20" />
                  <p className="font-black uppercase tracking-widest italic text-xs">Ustaw wagi i kliknij Optymalizuj</p>
                </div>
              )}
            </div>
          </div>

          {/* Podsumowanie punktów kluczowych (zamiast raportu AI) */}
          {results && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Oczekiwany Zwrot</p>
                <p className="text-2xl font-black text-blue-600">{(results.userPortfolio.expectedReturn * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ryzyko (Zmienność)</p>
                <p className="text-2xl font-black text-red-500">{(results.userPortfolio.volatility * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sharpe Ratio</p>
                <p className="text-2xl font-black text-slate-900">{results.userPortfolio.sharpeRatio.toFixed(3)}</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;

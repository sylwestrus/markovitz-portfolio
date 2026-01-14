
import React, { useState, useMemo, useCallback } from 'react';
import { Asset, OptimizationResults, PortfolioPoint } from './types';
import { generateEfficientFrontier, calculatePortfolioStats } from './mathUtils';
import { searchTickerData } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Loader2, Target, Search, Scale, AlertCircle, Award, Anchor } from 'lucide-react';

const AssetItem = React.memo(({ asset, onUpdate, onRemove }: { asset: Asset, onUpdate: (id: string, field: keyof Asset, value: string | number) => void, onRemove: (id: string) => void }) => (
  <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative hover:shadow-md transition-all">
    <div className="flex justify-between items-center mb-4">
      <span className="font-black text-slate-800 tracking-tight text-lg">{asset.ticker}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black px-3 py-1 rounded-full ${asset.weight > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
          {(asset.weight * 100).toFixed(1)}%
        </span>
        <button onClick={() => onRemove(asset.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
    <div className="mb-4">
      <input 
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={asset.weight}
        onChange={(e) => onUpdate(asset.id, 'weight', parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Zwrot %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 text-center" value={Math.round(asset.expectedReturn * 1000) / 10} onChange={(e) => onUpdate(asset.id, 'expectedReturn', Number(e.target.value) / 100)} />
      </div>
      <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Ryzyko %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 text-center" value={Math.round(asset.volatility * 1000) / 10} onChange={(e) => onUpdate(asset.id, 'volatility', Number(e.target.value) / 100)} />
      </div>
      <div className="bg-white p-2 rounded-xl border border-emerald-50 text-center">
        <label className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Dywid. %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-emerald-600 text-center" value={Math.round(asset.dividendYield * 1000) / 10} onChange={(e) => onUpdate(asset.id, 'dividendYield', Number(e.target.value) / 100)} />
      </div>
    </div>
  </div>
));

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', ticker: 'NVDA', weight: 0.20, expectedReturn: 0.35, volatility: 0.45, dividendYield: 0.001 },
    { id: '2', ticker: 'AAPL', weight: 0.20, expectedReturn: 0.15, volatility: 0.22, dividendYield: 0.006 },
    { id: '3', ticker: 'MSFT', weight: 0.20, expectedReturn: 0.18, volatility: 0.20, dividendYield: 0.007 },
    { id: '4', ticker: 'GOOGL', weight: 0.20, expectedReturn: 0.16, volatility: 0.24, dividendYield: 0.00 },
    { id: '5', ticker: 'TSLA', weight: 0.20, expectedReturn: 0.25, volatility: 0.55, dividendYield: 0.00 },
  ]);

  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tickerInput, setTickerInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const correlationMatrix = useMemo(() => {
    const size = assets.length;
    return Array(size).fill(0).map((_, i) => 
      Array(size).fill(0).map((_, j) => i === j ? 1 : 0.4)
    );
  }, [assets.length]);

  const currentUserPortfolio = useMemo(() => {
    if (assets.length === 0) return null;
    const weights = assets.map(a => a.weight);
    const stats = calculatePortfolioStats(weights, assets, correlationMatrix);
    return { ...stats, weights, label: 'Twój Portfel' };
  }, [assets, correlationMatrix]);

  const normalizeWeights = useCallback((currentAssets: Asset[]) => {
    const sum = currentAssets.reduce((s, a) => s + a.weight, 0);
    if (sum === 0) return currentAssets.map(a => ({ ...a, weight: 1 / currentAssets.length }));
    return currentAssets.map(a => ({ ...a, weight: a.weight / sum }));
  }, []);

  const applyPortfolioWeights = (point: PortfolioPoint) => {
    setAssets(prev => prev.map((asset, i) => ({
      ...asset,
      weight: point.weights[i]
    })));
  };

  const handleSearchAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = tickerInput.trim().toUpperCase();
    if (!cleanTicker || searching) return;
    
    setSearching(true);
    setError(null);
    try {
      const data = await searchTickerData(cleanTicker);
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        ticker: data.ticker || cleanTicker,
        weight: 0,
        expectedReturn: data.expectedReturn || 0.12,
        volatility: data.volatility || 0.30,
        dividendYield: data.dividendYield || 0,
      };
      setAssets(prev => normalizeWeights([newAsset, ...prev]));
      setTickerInput('');
    } catch (err) {
      setError("Nie udało się pobrać danych.");
    } finally {
      setSearching(false);
    }
  };

  const updateAsset = useCallback((id: string, field: keyof Asset, value: string | number) => {
    setAssets(prev => {
      if (field !== 'weight') return prev.map(a => a.id === id ? { ...a, [field]: value } : a);
      const newWeight = Math.max(0, Math.min(1, Number(value)));
      const others = prev.filter(a => a.id !== id);
      const othersSum = others.reduce((s, a) => s + a.weight, 0);
      if (others.length === 0) return [{ ...prev[0], weight: 1 }];
      return prev.map(a => {
        if (a.id === id) return { ...a, weight: newWeight };
        if (othersSum === 0) return { ...a, weight: (1 - newWeight) / others.length };
        const ratio = (1 - newWeight) / othersSum;
        return { ...a, weight: a.weight * ratio };
      });
    });
  }, []);

  const runOptimization = async () => {
    if (assets.length < 2) {
      setError("Dodaj min. 2 spółki.");
      return;
    }
    setLoading(true);
    setError(null);
    await new Promise(r => setTimeout(r, 100));
    try {
      const res = generateEfficientFrontier(assets, correlationMatrix);
      setResults(res);
    } catch (err) {
      setError("Błąd obliczeń.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-200 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
                <Target className="text-white w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">Markowitz Optimizer</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
              Portfolio <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Optimizer</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Shield className="w-6 h-6 text-blue-500" />
                Konfiguracja
              </h2>
              <button 
                onClick={() => setAssets(prev => normalizeWeights(prev))}
                title="Równomierne rozłożenie wag"
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-blue-600"
              >
                <Scale className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchAndAdd} className="relative mb-6">
              <input type="text" value={tickerInput} onChange={(e) => setTickerInput(e.target.value)} placeholder="Ticker (np. NVDA)..." className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button type="submit" disabled={searching} className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700">
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            {error && <div className="mb-4 text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} onUpdate={updateAsset} onRemove={(id) => setAssets(prev => normalizeWeights(prev.filter(a => a.id !== id)))} />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
              {results && (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button 
                    onClick={() => applyPortfolioWeights(results.maxSharpePortfolio)}
                    className="flex flex-col items-center gap-1 p-3 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-colors group"
                  >
                    <Award className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase text-amber-700">Max Sharpe</span>
                  </button>
                  <button 
                    onClick={() => applyPortfolioWeights(results.minRiskPortfolio)}
                    className="flex flex-col items-center gap-1 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors group"
                  >
                    <Anchor className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase text-emerald-700">Min Ryzyko</span>
                  </button>
                </div>
              )}
              
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400">Suma wag</span>
                <span className="text-xl font-black text-emerald-400">100.0%</span>
              </div>
              <button disabled={loading || assets.length === 0} onClick={runOptimization} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-blue-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-3">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-5 h-5" /> Oblicz Optymalizację</>}
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 flex flex-col h-[600px] min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <TrendingUp className="w-6 h-6 text-blue-500" /> Granica Efektywna
              </h3>
              {currentUserPortfolio && (
                <div className="flex gap-4 text-[10px] font-black uppercase bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <div><span className="text-slate-400 mr-2">E(r):</span><span className="text-blue-600">{(currentUserPortfolio.expectedReturn * 100).toFixed(1)}%</span></div>
                  <div><span className="text-slate-400 mr-2">σ:</span><span className="text-orange-500">{(currentUserPortfolio.volatility * 100).toFixed(1)}%</span></div>
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full relative">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="volatility" name="Ryzyko" unit="%" domain={['auto', 'auto']} tickFormatter={(v) => (v * 100).toFixed(0)} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="number" dataKey="expectedReturn" name="Zwrot" unit="%" domain={['auto', 'auto']} tickFormatter={(v) => (v * 100).toFixed(0)} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-[11px]">
                              <p className="font-black text-slate-900 mb-1">{d.label || 'Kombinacja'}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4"><span>Zwrot:</span><span className="font-bold text-blue-600">{(d.expectedReturn * 100).toFixed(2)}%</span></div>
                                <div className="flex justify-between gap-4"><span>Ryzyko:</span><span className="font-bold text-orange-500">{(d.volatility * 100).toFixed(2)}%</span></div>
                                <div className="flex justify-between gap-4 border-t pt-1"><span>Sharpe:</span><span className="font-bold text-indigo-600">{d.sharpeRatio.toFixed(2)}</span></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                    }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                    <Scatter name="Symulacje" data={results.efficientFrontier} fill="#cbd5e1" opacity={0.3} isAnimationActive={false} />
                    <Scatter name="Max Sharpe" data={[results.maxSharpePortfolio]} fill="#f59e0b" shape="diamond" />
                    <Scatter name="Min Ryzyko (MVP)" data={[results.minRiskPortfolio]} fill="#10b981" shape="star" />
                    {currentUserPortfolio && <Scatter name="Twój Portfel" data={[currentUserPortfolio]} fill="#ef4444" shape="cross" strokeWidth={2} />}
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-3xl">
                  <Target className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold text-slate-400 text-sm">Kliknij "Oblicz Optymalizację", aby wygenerować wykres.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

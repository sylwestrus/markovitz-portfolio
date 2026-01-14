
import React, { useState, useMemo, useCallback } from 'react';
import { Asset, OptimizationResults, PortfolioPoint } from './types';
import { generateEfficientFrontier, calculatePortfolioStats } from './mathUtils';
import { searchTickerData } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Loader2, Target, FileSpreadsheet, Search, Scale, Sparkles } from 'lucide-react';

// Memoized Asset Item for performance
const AssetItem = React.memo(({ asset, onUpdate, onRemove }: { asset: Asset, onUpdate: (id: string, field: keyof Asset, value: string | number) => void, onRemove: (id: string) => void }) => (
  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative hover:shadow-md transition-all">
    <div className="flex justify-between items-center mb-4">
      <span className="font-black text-slate-800 tracking-tight text-lg">{asset.ticker}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black px-3 py-1 rounded-full ${asset.weight > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
          {(asset.weight * 100).toFixed(1)}%
        </span>
        <button onClick={() => onRemove(asset.id)} className="text-slate-300 hover:text-red-500 transition-colors">
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
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Zwrot %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 text-center" value={(asset.expectedReturn * 100).toFixed(1)} onChange={(e) => onUpdate(asset.id, 'expectedReturn', Number(e.target.value) / 100)} />
      </div>
      <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Ryzyko %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700 text-center" value={(asset.volatility * 100).toFixed(1)} onChange={(e) => onUpdate(asset.id, 'volatility', Number(e.target.value) / 100)} />
      </div>
      <div className="bg-white p-2 rounded-xl border border-emerald-50 text-center">
        <label className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Dywid. %</label>
        <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-emerald-600 text-center" value={(asset.dividendYield * 100).toFixed(1)} onChange={(e) => onUpdate(asset.id, 'dividendYield', Number(e.target.value) / 100)} />
      </div>
    </div>
  </div>
));

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

  const correlationMatrix = useMemo(() => {
    const size = assets.length;
    return Array(size).fill(0).map((_, i) => 
      Array(size).fill(0).map((_, j) => i === j ? 1 : 0.4)
    );
  }, [assets.length]);

  const currentUserPortfolio = useMemo(() => {
    const weights = assets.map(a => a.weight);
    const stats = calculatePortfolioStats(weights, assets, correlationMatrix);
    return { ...stats, weights, label: 'Twój Portfel' };
  }, [assets, correlationMatrix]);

  const totalWeight = useMemo(() => assets.reduce((sum, a) => sum + Number(a.weight), 0), [assets]);
  
  // Normalizes weights so they always sum exactly to 1.0 (100%)
  const normalizeWeights = useCallback((currentAssets: Asset[]) => {
    const sum = currentAssets.reduce((s, a) => s + a.weight, 0);
    if (sum === 0) return currentAssets.map(a => ({ ...a, weight: 1 / currentAssets.length }));
    return currentAssets.map(a => ({ ...a, weight: a.weight / sum }));
  }, []);

  const applyPreset = useCallback((point: PortfolioPoint) => {
    if (!point.weights) return;
    setAssets(prev => prev.map((asset, index) => ({
      ...asset,
      weight: point.weights[index] || 0
    })));
  }, []);

  const handleSearchAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput.trim() || searching) return;
    setSearching(true);
    try {
      const data = await searchTickerData(tickerInput);
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        ticker: data.ticker || tickerInput.toUpperCase(),
        weight: 0,
        expectedReturn: data.expectedReturn || 0.15,
        volatility: data.volatility || 0.30,
        dividendYield: data.dividendYield || 0,
      };
      // When adding, we normalize to include the new asset
      setAssets(prev => normalizeWeights([newAsset, ...prev]));
      setTickerInput('');
    } finally {
      setSearching(false);
    }
  };

  const handleRemoveAsset = useCallback((id: string) => {
    setAssets(prev => normalizeWeights(prev.filter(a => a.id !== id)));
  }, [normalizeWeights]);

  const updateAsset = useCallback((id: string, field: keyof Asset, value: string | number) => {
    setAssets(prev => {
      if (field !== 'weight') {
        return prev.map(a => a.id === id ? { ...a, [field]: value } : a);
      }

      // Weight constraint logic:
      // If user moves one slider, the others must adjust proportionally to keep sum at 1.0
      const newWeight = Number(value);
      const otherAssets = prev.filter(a => a.id !== id);
      const otherSum = otherAssets.reduce((s, a) => s + a.weight, 0);
      
      const updated = prev.map(a => {
        if (a.id === id) return { ...a, weight: newWeight };
        if (otherSum === 0) return { ...a, weight: (1 - newWeight) / otherAssets.length };
        // Distribute remaining capacity proportionally
        const ratio = (1 - newWeight) / otherSum;
        return { ...a, weight: a.weight * ratio };
      });

      return updated;
    });
  }, []);

  const equalizeWeights = () => {
    if (assets.length === 0) return;
    const equalWeight = 1 / assets.length;
    setAssets(assets.map(a => ({ ...a, weight: equalWeight })));
  };

  const runOptimization = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 50));
    try {
      const res = generateEfficientFrontier(assets, correlationMatrix);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 border-b border-slate-200 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                <Target className="text-white w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Smart Investing Engine</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              Markowitz <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl text-lg">
              Automatyczne bilansowanie portfela — suma wag zawsze wynosi 100%.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-emerald-100 shadow-sm text-emerald-600 uppercase tracking-widest">
              <Shield className="w-3 h-3 text-emerald-500" />
              Auto-balancing active
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Shield className="w-6 h-6 text-red-500" />
                Konfiguracja Portfela
              </h2>
            </div>

            {results && (
              <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <button onClick={() => applyPreset(results.maxSharpePortfolio)} className="relative bg-slate-900 text-white p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg overflow-hidden text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                  <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-[10px] font-black uppercase">Max Sharpe</span></div>
                  <div className="text-[10px] font-bold text-slate-400">E: {(results.maxSharpePortfolio.expectedReturn * 100).toFixed(1)}% | σ: {(results.maxSharpePortfolio.volatility * 100).toFixed(1)}%</div>
                </button>
                <button onClick={() => applyPreset(results.minRiskPortfolio)} className="relative bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-md overflow-hidden text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                  <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-black uppercase">Min Risk</span></div>
                  <div className="text-[10px] font-bold text-slate-400">E: {(results.minRiskPortfolio.expectedReturn * 100).toFixed(1)}% | σ: {(results.minRiskPortfolio.volatility * 100).toFixed(1)}%</div>
                </button>
              </div>
            )}

            <div className="flex gap-2 mb-6">
                <button onClick={equalizeWeights} className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm"><Scale className="w-4 h-4" /> Wyrównaj</button>
                <button onClick={() => window.print()} className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm"><FileSpreadsheet className="w-4 h-4" /> Drukuj</button>
            </div>

            <form onSubmit={handleSearchAndAdd} className="relative mb-6">
              <input type="text" value={tickerInput} onChange={(e) => setTickerInput(e.target.value.toUpperCase())} placeholder="Dodaj Ticker..." className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button type="submit" disabled={searching} className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-blue-200">
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} onUpdate={updateAsset} onRemove={handleRemoveAsset} />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-5">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-inner">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Łączna alokacja</span>
                <span className="text-xl font-black text-emerald-400">100.0%</span>
              </div>
              <button disabled={loading || assets.length === 0} onClick={runOptimization} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-black disabled:bg-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Oblicz</>}
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 h-full min-h-[600px] flex flex-col">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><TrendingUp className="w-6 h-6 text-red-500" /> Granica Efektywna</h3>
            <div className="flex-1 w-full">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                    <XAxis type="number" dataKey="volatility" name="Ryzyko" unit="%" domain={['auto', 'auto']} tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#64748b" fontSize={11} />
                    <YAxis type="number" dataKey="expectedReturn" name="Zwrot" unit="%" domain={['auto', 'auto']} tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#64748b" fontSize={11} />
                    <ZAxis range={[60, 200]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-2xl rounded-2xl">
                            <p className="font-black text-slate-900 border-b mb-2 pb-1 text-xs">{d.label || 'Kombinacja'}</p>
                            <div className="space-y-1 text-[10px] font-bold">
                              <div className="flex justify-between gap-6"><span>ZWROT</span><span className="text-blue-600">{(d.expectedReturn * 100).toFixed(2)}%</span></div>
                              <div className="flex justify-between gap-6"><span>RYZYKO</span><span className="text-orange-500">{(d.volatility * 100).toFixed(2)}%</span></div>
                              <div className="flex justify-between gap-6 pt-1 border-t"><span>SHARPE</span><span className="text-indigo-600">{d.sharpeRatio.toFixed(3)}</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend verticalAlign="top" align="right" />
                    <Scatter name="Symulacje" data={results.efficientFrontier} fill="#cbd5e1" opacity={0.15} isAnimationActive={false} />
                    <Scatter name="Max Sharpe" data={[results.maxSharpePortfolio]} fill="#f59e0b" shape="diamond" />
                    <Scatter name="Min Ryzyko" data={[results.minRiskPortfolio]} fill="#10b981" shape="star" />
                    <Scatter name="Twój Portfel" data={[currentUserPortfolio]} fill="#ef4444" shape="cross" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-3xl">
                  <Target className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-bold text-center px-12 text-slate-400 text-sm leading-relaxed">
                    Kliknij "Oblicz", aby wyznaczyć optymalne wagi metodą Markowitza.
                  </p>
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

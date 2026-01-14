
import React, { useState, useMemo, useEffect } from 'react';
import { Asset, OptimizationResults } from './types';
import { generateEfficientFrontier } from './mathUtils';
import { getAiPortfolioAnalysis } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Info, Loader2, Target } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', ticker: 'Unilever', weight: 0.20, expectedReturn: 0.075, volatility: 0.15 },
    { id: '2', ticker: 'National Grid', weight: 0.20, expectedReturn: 0.09, volatility: 0.16 },
    { id: '3', ticker: 'Aviva', weight: 0.15, expectedReturn: 0.12, volatility: 0.22 },
    { id: '4', ticker: 'Legal & General', weight: 0.15, expectedReturn: 0.115, volatility: 0.21 },
    { id: '5', ticker: 'Phoenix Group', weight: 0.06, expectedReturn: 0.105, volatility: 0.28 },
    { id: '6', ticker: 'M&G', weight: 0.07, expectedReturn: 0.10, volatility: 0.26 },
    { id: '7', ticker: 'Shell (SHEL)', weight: 0.17, expectedReturn: 0.135, volatility: 0.24 },
  ]);

  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const totalWeight = assets.reduce((sum, a) => sum + Number(a.weight), 0);

  const handleAddAsset = () => {
    const newAsset: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: 'NEW',
      weight: 0,
      expectedReturn: 0.1,
      volatility: 0.2,
    };
    setAssets([...assets, newAsset]);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof Asset, value: string | number) => {
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const runOptimization = async () => {
    setLoading(true);
    setAiInsight(null);
    
    const size = assets.length;
    const matrix = Array(size).fill(0).map((_, i) => 
      Array(size).fill(0).map((_, j) => i === j ? 1 : 0.25)
    );

    try {
      const res = generateEfficientFrontier(assets, matrix);
      setResults(res);
      const insight = await getAiPortfolioAnalysis(assets, res);
      setAiInsight(insight);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatAiText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/^- (.*)/gm, '• $1');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <Target className="text-blue-600 w-10 h-10" />
          Markowitz <span className="text-blue-600">Pro</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Optymalizacja portfela dywidendowego UK (Shell, Unilever, Finanse).</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-500" />
                Skład Portfela
              </h2>
              <button 
                onClick={handleAddAsset}
                className="bg-slate-100 text-slate-600 p-2 rounded-full hover:bg-blue-600 hover:text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <div key={asset.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800">{asset.ticker}</span>
                    <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                      {(asset.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Waga %</label>
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-sm font-semibold"
                        value={Math.round(asset.weight * 1000) / 10}
                        onChange={(e) => updateAsset(asset.id, 'weight', Number(e.target.value) / 100)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Zwrot %</label>
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-sm font-semibold"
                        value={asset.expectedReturn * 100}
                        onChange={(e) => updateAsset(asset.id, 'expectedReturn', Number(e.target.value) / 100)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Ryzyko %</label>
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-sm font-semibold"
                        value={asset.volatility * 100}
                        onChange={(e) => updateAsset(asset.id, 'volatility', Number(e.target.value) / 100)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-slate-500">Suma alokacji:</span>
                <span className={`text-lg font-black ${Math.abs(totalWeight - 1) < 0.01 ? "text-green-500" : "text-red-500"}`}>
                  {Math.round(totalWeight * 100)}%
                </span>
              </div>
              <button 
                disabled={loading || Math.abs(totalWeight - 1) > 0.05}
                onClick={runOptimization}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                ZNAJDŹ OPTYMALNE WAGI
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-6 h-6 text-green-500" />
              Krzywa Efektywna Markowitza
            </h3>
            <div className="h-[450px] w-full">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                    <XAxis 
                      type="number" 
                      dataKey="volatility" 
                      name="Ryzyko (Odchylenie)" 
                      unit="%" 
                      domain={['dataMin - 0.02', 'dataMax + 0.02']}
                      tickFormatter={(val) => (val * 100).toFixed(0)}
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Ryzyko (Zmienność)', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="expectedReturn" 
                      name="Oczekiwany Zwrot" 
                      unit="%" 
                      domain={['dataMin - 0.01', 'dataMax + 0.01']}
                      tickFormatter={(val) => (val * 100).toFixed(1)}
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Oczekiwany Zwrot', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 'bold' }}
                    />
                    <ZAxis range={[60, 200]} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-2xl rounded-2xl ring-1 ring-black/5">
                              <p className="font-black text-slate-900 border-b border-slate-100 mb-2 pb-1 text-xs">{d.label || 'Kombinacja Wag'}</p>
                              <div className="space-y-2">
                                <div className="flex justify-between gap-8 text-[10px] font-bold">
                                  <span className="text-slate-400 uppercase">Zwrot (E)</span>
                                  <span className="text-blue-600">{(d.expectedReturn * 100).toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between gap-8 text-[10px] font-bold">
                                  <span className="text-slate-400 uppercase">Ryzyko (σ)</span>
                                  <span className="text-orange-500">{(d.volatility * 100).toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between gap-8 text-[10px] font-bold pt-1 border-t border-slate-50">
                                  <span className="text-slate-400 uppercase">Wsk. Sharpe'a</span>
                                  <span className="text-indigo-600">{d.sharpeRatio.toFixed(3)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle" 
                      wrapperStyle={{ paddingBottom: '30px', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value) => <span className="text-slate-700">{value}</span>}
                    />
                    <Scatter 
                      name="Możliwe Kombinacje" 
                      data={results.efficientFrontier} 
                      fill="#cbd5e1" 
                      opacity={0.3} 
                    />
                    <Scatter 
                      name="Optimum (Wysoki Sharpe)" 
                      data={[results.maxSharpePortfolio]} 
                      fill="#f59e0b" 
                      shape="diamond"
                    />
                    <Scatter 
                      name="Najniższe Ryzyko" 
                      data={[results.minRiskPortfolio]} 
                      fill="#10b981" 
                      shape="star"
                    />
                    <Scatter 
                      name="Twój Obecny Portfel" 
                      data={[results.userPortfolio]} 
                      fill="#2563eb" 
                      shape="cross"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-3xl">
                  <Target className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-bold">Uruchom analizę, aby wygenerować mapę ryzyka i zysku.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Strategia Dywidendowa i Analiza AI
            </h3>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse text-sm">Przeszukiwanie granicy efektywnej...</p>
              </div>
            ) : aiInsight ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-700 leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                <div className="prose prose-slate prose-sm max-w-none ai-content" dangerouslySetInnerHTML={{ __html: formatAiText(aiInsight) }} />
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-50 rounded-2xl">
                <p className="text-slate-400 font-medium italic text-sm">System Markowitza podpowie Ci, jak zoptymalizować wagi pod kątem dywidend i bezpieczeństwa.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

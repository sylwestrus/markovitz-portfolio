
import React, { useState } from 'react';
import { Asset, OptimizationResults } from './types';
import { generateEfficientFrontier } from './mathUtils';
import { getAiPortfolioAnalysis } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Loader2, Target, Banknote } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', ticker: 'Unilever', weight: 0.20, expectedReturn: 0.075, volatility: 0.15, dividendYield: 0.038 },
    { id: '2', ticker: 'National Grid', weight: 0.20, expectedReturn: 0.09, volatility: 0.16, dividendYield: 0.052 },
    { id: '3', ticker: 'Aviva', weight: 0.15, expectedReturn: 0.12, volatility: 0.22, dividendYield: 0.071 },
    { id: '4', ticker: 'Legal & General', weight: 0.15, expectedReturn: 0.115, volatility: 0.21, dividendYield: 0.082 },
    { id: '5', ticker: 'Phoenix Group', weight: 0.06, expectedReturn: 0.105, volatility: 0.28, dividendYield: 0.104 },
    { id: '6', ticker: 'M&G', weight: 0.07, expectedReturn: 0.10, volatility: 0.26, dividendYield: 0.091 },
    { id: '7', ticker: 'Shell (SHEL)', weight: 0.17, expectedReturn: 0.135, volatility: 0.24, dividendYield: 0.041 },
  ]);

  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const totalWeight = assets.reduce((sum, a) => sum + Number(a.weight), 0);
  const currentPortfolioYield = assets.reduce((sum, a) => sum + (a.weight * a.dividendYield), 0);

  const handleAddAsset = () => {
    const newAsset: Asset = {
      id: Math.random().toString(36).substr(2, 9),
      ticker: 'NOWA',
      weight: 0,
      expectedReturn: 0.1,
      volatility: 0.2,
      dividendYield: 0.04,
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
        <p className="text-slate-500 mt-2 font-medium">Optymalizacja portfela dywidendowego UK z uwzględnieniem yield'u.</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-500" />
                Skład i Dywidendy
              </h2>
              <button onClick={handleAddAsset} className="bg-slate-100 text-slate-600 p-2 rounded-full hover:bg-blue-600 hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <div key={asset.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800">{asset.ticker}</span>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Div: {(asset.dividendYield * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                        {(asset.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Waga %</label>
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 outline-none py-1 text-xs font-semibold" value={Math.round(asset.weight * 1000) / 10} onChange={(e) => updateAsset(asset.id, 'weight', Number(e.target.value) / 100)} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Zwrot %</label>
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 outline-none py-1 text-xs font-semibold" value={asset.expectedReturn * 100} onChange={(e) => updateAsset(asset.id, 'expectedReturn', Number(e.target.value) / 100)} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Ryzyko %</label>
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 outline-none py-1 text-xs font-semibold" value={asset.volatility * 100} onChange={(e) => updateAsset(asset.id, 'volatility', Number(e.target.value) / 100)} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-emerald-500 uppercase">Dywid. %</label>
                      <input type="number" className="w-full bg-transparent border-b border-emerald-100 outline-none py-1 text-xs font-semibold" value={asset.dividendYield * 100} onChange={(e) => updateAsset(asset.id, 'dividendYield', Number(e.target.value) / 100)} />
                    </div>
                  </div>
                  <button onClick={() => handleRemoveAsset(asset.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Yield Portfela:</span>
                </div>
                <span className="text-lg font-black text-emerald-700">{(currentPortfolioYield * 100).toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center px-3">
                <span className="text-sm font-medium text-slate-500">Suma alokacji:</span>
                <span className={`text-lg font-black ${Math.abs(totalWeight - 1) < 0.01 ? "text-green-500" : "text-red-500"}`}>
                  {Math.round(totalWeight * 100)}%
                </span>
              </div>

              <button disabled={loading || Math.abs(totalWeight - 1) > 0.05} onClick={runOptimization} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                OPTYMALIZUJ PORTFEL
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-6 h-6 text-green-500" />
              Efektywność Inwestycyjna
            </h3>
            <div className="h-[400px] w-full">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                    <XAxis type="number" dataKey="volatility" name="Ryzyko" unit="%" domain={['dataMin - 0.02', 'dataMax + 0.02']} tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#64748b" fontSize={11} />
                    <YAxis type="number" dataKey="expectedReturn" name="Zwrot" unit="%" domain={['dataMin - 0.01', 'dataMax + 0.01']} tickFormatter={(val) => (val * 100).toFixed(1)} stroke="#64748b" fontSize={11} />
                    <ZAxis range={[60, 200]} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-2xl rounded-2xl ring-1 ring-black/5">
                            <p className="font-black text-slate-900 border-b border-slate-100 mb-2 pb-1 text-xs">{d.label || 'Kombinacja'}</p>
                            <div className="space-y-1 text-[10px] font-bold">
                              <div className="flex justify-between gap-6"><span className="text-slate-400">ZWROT</span><span className="text-blue-600">{(d.expectedReturn * 100).toFixed(2)}%</span></div>
                              <div className="flex justify-between gap-6"><span className="text-slate-400">RYZYKO</span><span className="text-orange-500">{(d.volatility * 100).toFixed(2)}%</span></div>
                              {d.dividendYield !== undefined && <div className="flex justify-between gap-6"><span className="text-emerald-500">DYWIDENDA</span><span>{(d.dividendYield * 100).toFixed(2)}%</span></div>}
                              <div className="flex justify-between gap-6 pt-1 border-t border-slate-50"><span className="text-slate-400">SHARPE</span><span className="text-indigo-600">{d.sharpeRatio.toFixed(3)}</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                    <Scatter name="Kombinacje" data={results.efficientFrontier} fill="#cbd5e1" opacity={0.3} />
                    <Scatter name="Max Sharpe" data={[results.maxSharpePortfolio]} fill="#f59e0b" shape="diamond" />
                    <Scatter name="Min Ryzyko" data={[results.minRiskPortfolio]} fill="#10b981" shape="star" />
                    <Scatter name="Twój Portfel" data={[results.userPortfolio]} fill="#2563eb" shape="cross" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-3xl">
                  <Target className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-bold">Uruchom optymalizację, by zobaczyć analizę ryzyko-zysk.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Strategia i Dywidendy (AI)
            </h3>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse text-sm">Przeliczanie optymalnego strumienia dywidend...</p>
              </div>
            ) : aiInsight ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-700 leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                <div className="prose prose-slate prose-sm max-w-none ai-content" dangerouslySetInnerHTML={{ __html: formatAiText(aiInsight) }} />
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-50 rounded-2xl">
                <p className="text-slate-400 font-medium italic text-sm">Model AI przeanalizuje Twoje wagi i zasugeruje poprawki zwiększające dywidendy lub bezpieczeństwo.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

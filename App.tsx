
import React, { useState } from 'react';
import { Asset, OptimizationResults } from './types';
import { generateEfficientFrontier } from './mathUtils';
import { getAiPortfolioAnalysis, searchTickerData } from './geminiService';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, TrendingUp, Shield, Zap, Loader2, Target, FileSpreadsheet, Search, Scale, Info, Sparkles } from 'lucide-react';

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
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const totalWeight = assets.reduce((sum, a) => sum + Number(a.weight), 0);
  const currentPortfolioYield = assets.reduce((sum, a) => sum + (a.weight * a.dividendYield), 0);

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
      setAssets(prev => [newAsset, ...prev]);
      setTickerInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof Asset, value: string | number) => {
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const equalizeWeights = () => {
    if (assets.length === 0) return;
    const equalWeight = 1 / assets.length;
    setAssets(assets.map(a => ({ ...a, weight: equalWeight })));
  };

  const exportTableFile = () => {
    const headers = ['Ticker', 'Waga %', 'Zwrot %', 'Ryzyko %', 'Dywidenda %'].join('\t');
    const rows = assets.map(a => [
      a.ticker,
      (a.weight * 100).toFixed(2).replace('.', ','),
      (a.expectedReturn * 100).toFixed(2).replace('.', ','),
      (a.volatility * 100).toFixed(2).replace('.', ','),
      (a.dividendYield * 100).toFixed(2).replace('.', ',')
    ].join('\t')).join('\n');

    const fileContent = `${headers}\n${rows}\n\nSUMA YIELD PORTFELA:\t${(currentPortfolioYield * 100).toFixed(2).replace('.', ',')}%`;
    
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analiza_portfela_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runOptimization = async () => {
    setLoading(true);
    setAiInsight(null);
    
    const size = assets.length;
    const matrix = Array(size).fill(0).map((_, i) => 
      Array(size).fill(0).map((_, j) => i === j ? 1 : 0.4)
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
      <header className="max-w-6xl mx-auto mb-8 border-b border-slate-200 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Target className="text-white w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Smart Investing Engine</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              Markowitz <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl text-lg">
              Quantum Portfolio Builder — profesjonalna optymalizacja ryzyka wspierana przez sztuczną inteligencję.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-slate-200 shadow-sm text-slate-500 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              Powered by Gemini 3 Pro
            </div>
            <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl text-xs font-bold border border-indigo-100 shadow-sm">
              Monte Carlo: 3,000 Iterations
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
                Konfiguracja Aktywów
              </h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">Zdefiniuj składniki swojego portfela</p>
            </div>

            <div className="flex gap-2 mb-6">
                <button 
                  onClick={equalizeWeights}
                  className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-100 shadow-sm"
                >
                  <Scale className="w-4 h-4" /> Wyrównaj wagi
                </button>
                <button 
                  onClick={exportTableFile} 
                  className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-emerald-100 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Eksportuj dane
                </button>
            </div>

            <form onSubmit={handleSearchAndAdd} className="relative mb-6">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="Dodaj ticker (np. NVDA, BTC, PLTR)..."
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-400"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button 
                type="submit"
                disabled={searching}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-lg shadow-blue-200"
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset) => (
                <div key={asset.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black text-slate-800 tracking-tight text-lg">{asset.ticker}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${asset.weight > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {(asset.weight * 100).toFixed(1)}%
                      </span>
                      <button onClick={() => handleRemoveAsset(asset.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={asset.weight}
                      onChange={(e) => updateAsset(asset.id, 'weight', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Zwrot %</label>
                      <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700" value={(asset.expectedReturn * 100).toFixed(1)} onChange={(e) => updateAsset(asset.id, 'expectedReturn', Number(e.target.value) / 100)} />
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Ryzyko %</label>
                      <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-slate-700" value={(asset.volatility * 100).toFixed(1)} onChange={(e) => updateAsset(asset.id, 'volatility', Number(e.target.value) / 100)} />
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-50">
                      <label className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Dywid. %</label>
                      <input type="number" step="0.1" className="w-full bg-transparent outline-none text-xs font-bold text-emerald-600" value={(asset.dividendYield * 100).toFixed(1)} onChange={(e) => updateAsset(asset.id, 'dividendYield', Number(e.target.value) / 100)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  <span>Alokacja Kapitału</span>
                  <span className={Math.abs(totalWeight - 1) < 0.001 ? "text-green-500" : totalWeight > 1 ? "text-red-500" : "text-blue-500"}>
                    {(totalWeight * 100).toFixed(1)}% / 100%
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <div 
                    className={`h-full transition-all duration-300 ${totalWeight > 1 ? 'bg-red-500' : Math.abs(totalWeight - 1) < 0.001 ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(totalWeight * 100, 100)}%` }}
                  />
                </div>
              </div>

              <button 
                disabled={loading || Math.abs(totalWeight - 1) > 0.05 || assets.length === 0} 
                onClick={runOptimization} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-black disabled:bg-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 text-sm tracking-widest uppercase"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
                Optymalizuj Portfel
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-6 h-6 text-red-500" />
              Wizualizacja: Efficient Frontier
            </h3>
            <div className="h-[400px] w-full">
              {results ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                    <XAxis type="number" dataKey="volatility" name="Ryzyko" unit="%" domain={['auto', 'auto']} tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#64748b" fontSize={11} />
                    <YAxis type="number" dataKey="expectedReturn" name="Zwrot" unit="%" domain={['auto', 'auto']} tickFormatter={(val) => (val * 100).toFixed(0)} stroke="#64748b" fontSize={11} />
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
                              <div className="flex justify-between gap-6 pt-1 border-t border-slate-50"><span className="text-slate-400">SHARPE</span><span className="text-indigo-600">{d.sharpeRatio.toFixed(3)}</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                    <Scatter name="Symulacje (3,000 portfeli)" data={results.efficientFrontier} fill="#cbd5e1" opacity={0.2} />
                    <Scatter name="Optimum (Max Sharpe)" data={[results.maxSharpePortfolio]} fill="#f59e0b" shape="diamond" />
                    <Scatter name="Min. Ryzyko" data={[results.minRiskPortfolio]} fill="#10b981" shape="star" />
                    <Scatter name="Twój Wybór" data={[results.userPortfolio]} fill="#ef4444" shape="cross" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-3xl">
                  <Target className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-bold text-center px-12 text-slate-400 leading-relaxed">
                    Uruchom silnik optymalizacyjny, aby przeliczyć 3,000 wariantów alokacji Monte Carlo i wyznaczyć matematyczny ideał Twojego portfela.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              Wnioski Strategiczne AI
            </h3>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse text-sm text-center uppercase tracking-widest">
                  Analiza korelacji Gemini AI...
                </p>
              </div>
            ) : aiInsight ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-700 leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                <div className="prose prose-slate prose-sm max-w-none ai-content" dangerouslySetInnerHTML={{ __html: formatAiText(aiInsight) }} />
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-50 rounded-2xl">
                <p className="text-slate-400 font-medium italic text-sm px-12">
                  Po obliczeniu granicy efektywnej, sztuczna inteligencja wygeneruje dedykowany raport oceniający spójność Twojej strategii.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

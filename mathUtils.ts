
import { Asset, PortfolioPoint, OptimizationResults } from './types';

export function calculatePortfolioStats(weights: number[], assets: Asset[], correlationMatrix: number[][]): { expectedReturn: number, volatility: number, sharpeRatio: number, dividendYield: number } {
  let expectedReturn = 0;
  let dividendYield = 0;
  const n = weights.length;

  for (let i = 0; i < n; i++) {
    expectedReturn += weights[i] * assets[i].expectedReturn;
    dividendYield += weights[i] * (assets[i].dividendYield || 0);
  }
  
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const wi_vi = weights[i] * assets[i].volatility;
    for (let j = 0; j < n; j++) {
      // Optymalizacja: wyciągnięcie stałych przed wewnętrzną pętlę lub pre-kalkulacja
      variance += wi_vi * (weights[j] * assets[j].volatility) * correlationMatrix[i][j];
    }
  }
  
  const volatility = Math.sqrt(variance);
  const rf = 0.02; 
  const sharpeRatio = volatility > 0.0001 ? (expectedReturn - rf) / volatility : 0;
  
  return { expectedReturn, volatility, sharpeRatio, dividendYield };
}

export function generateEfficientFrontier(assets: Asset[], correlationMatrix: number[][]): OptimizationResults {
  const numSimulations = 3000; 
  const points: PortfolioPoint[] = new Array(numSimulations);
  const n = assets.length;
  
  let minRiskPoint: PortfolioPoint | null = null;
  let maxSharpePoint: PortfolioPoint | null = null;

  for (let s = 0; s < numSimulations; s++) {
    const weights = new Array(n);
    let sumWeights = 0;
    
    for (let i = 0; i < n; i++) {
      const w = Math.random();
      weights[i] = w;
      sumWeights += w;
    }
    
    for (let i = 0; i < n; i++) {
      weights[i] /= sumWeights;
    }
    
    const stats = calculatePortfolioStats(weights, assets, correlationMatrix);
    const point: PortfolioPoint = { ...stats, weights };
    
    points[s] = point;
    
    if (!minRiskPoint || stats.volatility < minRiskPoint.volatility) minRiskPoint = point;
    if (!maxSharpePoint || stats.sharpeRatio > maxSharpePoint.sharpeRatio) maxSharpePoint = point;
  }

  const userWeights = assets.map(a => a.weight);
  const userStats = calculatePortfolioStats(userWeights, assets, correlationMatrix);
  const userPortfolio = { ...userStats, weights: userWeights, label: 'Twój Portfel' };

  return {
    userPortfolio,
    minRiskPortfolio: { ...minRiskPoint!, label: 'Portfel Min. Ryzyka' },
    maxSharpePortfolio: { ...maxSharpePoint!, label: 'Portfel Max. Sharpe' },
    efficientFrontier: points,
    correlationMatrix
  };
}

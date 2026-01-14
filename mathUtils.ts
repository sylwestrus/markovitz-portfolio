
import { Asset, PortfolioPoint, OptimizationResults } from './types';

export function calculatePortfolioStats(weights: number[], assets: Asset[], correlationMatrix: number[][]): { expectedReturn: number, volatility: number, sharpeRatio: number, dividendYield: number } {
  let expectedReturn = 0;
  let dividendYield = 0;
  const n = weights.length;

  // Cache assets data into arrays for faster access in tight loops
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    const asset = assets[i];
    expectedReturn += w * asset.expectedReturn;
    dividendYield += w * (asset.dividendYield || 0);
  }
  
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const wi = weights[i];
    const vi = assets[i].volatility;
    const wi_vi = wi * vi;
    
    // Inner loop optimization
    const row = correlationMatrix[i];
    for (let j = 0; j < n; j++) {
      variance += wi_vi * (weights[j] * assets[j].volatility) * row[j];
    }
  }
  
  const volatility = Math.sqrt(variance);
  const rf = 0.02; // Risk-free rate
  const sharpeRatio = volatility > 0.0001 ? (expectedReturn - rf) / volatility : 0;
  
  return { expectedReturn, volatility, sharpeRatio, dividendYield };
}

export function generateEfficientFrontier(assets: Asset[], correlationMatrix: number[][]): OptimizationResults {
  const numSimulations = 3000; 
  const points: PortfolioPoint[] = new Array(numSimulations);
  const n = assets.length;
  
  if (n === 0) throw new Error("No assets provided for optimization");

  let minRiskPoint: PortfolioPoint | null = null;
  let maxSharpePoint: PortfolioPoint | null = null;

  for (let s = 0; s < numSimulations; s++) {
    const weights = new Float64Array(n);
    let sumWeights = 0;
    
    for (let i = 0; i < n; i++) {
      const w = Math.random();
      weights[i] = w;
      sumWeights += w;
    }
    
    // Normalize weights
    const normalizedWeights = new Array(n);
    for (let i = 0; i < n; i++) {
      normalizedWeights[i] = weights[i] / sumWeights;
    }
    
    const stats = calculatePortfolioStats(normalizedWeights, assets, correlationMatrix);
    const point: PortfolioPoint = { ...stats, weights: normalizedWeights };
    
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

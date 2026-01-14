
import { Asset, PortfolioPoint, OptimizationResults } from './types';

export function calculatePortfolioStats(weights: number[], assets: Asset[], correlationMatrix: number[][]): { expectedReturn: number, volatility: number, sharpeRatio: number, dividendYield: number } {
  const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
  const dividendYield = weights.reduce((sum, w, i) => sum + w * (assets[i].dividendYield || 0), 0);
  
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * assets[i].volatility * assets[j].volatility * correlationMatrix[i][j];
    }
  }
  
  const volatility = Math.sqrt(variance);
  const rf = 0.02; // Risk-free rate 2%
  const sharpeRatio = volatility > 0 ? (expectedReturn - rf) / volatility : 0;
  
  return { expectedReturn, volatility, sharpeRatio, dividendYield };
}

export function generateEfficientFrontier(assets: Asset[], correlationMatrix: number[][]): OptimizationResults {
  const points: PortfolioPoint[] = [];
  const numSimulations = 3000; 
  
  let minRisk: PortfolioPoint | null = null;
  let maxSharpe: PortfolioPoint | null = null;

  for (let s = 0; s < numSimulations; s++) {
    const rawWeights = assets.map(() => Math.random());
    const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map(w => w / sumWeights);
    
    const stats = calculatePortfolioStats(weights, assets, correlationMatrix);
    const point: PortfolioPoint = { ...stats, weights };
    
    points.push(point);
    
    if (!minRisk || point.volatility < minRisk.volatility) minRisk = point;
    if (!maxSharpe || point.sharpeRatio > maxSharpe.sharpeRatio) maxSharpe = point;
  }

  const userWeights = assets.map(a => a.weight);
  const userStats = calculatePortfolioStats(userWeights, assets, correlationMatrix);
  const userPortfolio = { ...userStats, weights: userWeights, label: 'Twój Portfel' };

  return {
    userPortfolio,
    minRiskPortfolio: { ...minRisk!, label: 'Portfel Min. Ryzyka' },
    maxSharpePortfolio: { ...maxSharpe!, label: 'Portfel Max. Sharpe' },
    efficientFrontier: points,
    correlationMatrix
  };
}

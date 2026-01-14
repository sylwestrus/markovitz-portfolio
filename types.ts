
export interface Asset {
  id: string;
  ticker: string;
  weight: number;
  expectedReturn: number;
  volatility: number;
}

export interface PortfolioPoint {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: number[];
  label?: string;
}

export interface OptimizationResults {
  userPortfolio: PortfolioPoint;
  minRiskPortfolio: PortfolioPoint;
  maxSharpePortfolio: PortfolioPoint;
  efficientFrontier: PortfolioPoint[];
  correlationMatrix: number[][];
  aiAnalysis?: string;
}

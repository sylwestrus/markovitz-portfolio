
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResults, Asset } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function searchTickerData(ticker: string): Promise<Partial<Asset>> {
  const prompt = `Zidentyfikuj spółkę o tickerze: ${ticker}. 
    Zwróć dane finansowe w formacie JSON:
    - expectedReturn: roczny zwrot (np. 0.15)
    - volatility: zmienność (np. 0.3)
    - dividendYield: stopa dywidendy (np. 0.01)
    - sector: nazwa sektora (np. 'Technology', 'Space', 'Crypto')
    Bazuj na aktualnych danych rynkowych.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticker: { type: Type.STRING },
            expectedReturn: { type: Type.NUMBER },
            volatility: { type: Type.NUMBER },
            dividendYield: { type: Type.NUMBER },
            sector: { type: Type.STRING }
          },
          required: ["ticker", "expectedReturn", "volatility", "dividendYield"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Ticker search error:", error);
    return {
      ticker: ticker.toUpperCase(),
      expectedReturn: 0.12,
      volatility: 0.35,
      dividendYield: 0
    };
  }
}

export async function getAiPortfolioAnalysis(assets: Asset[], results: OptimizationResults): Promise<string> {
  const prompt = `
    Działaj jako Quant Strategist & AI Portfolio Advisor.
    Przeanalizuj portfel:
    ${assets.map(a => `${a.ticker}: Waga ${(a.weight * 100).toFixed(1)}%, Ryzyko ${(a.volatility * 100).toFixed(1)}%`).join('\n')}
    
    Wskaźniki portfela:
    - Oczekiwany zwrot: ${(results.userPortfolio.expectedReturn * 100).toFixed(2)}%
    - Zmienność: ${(results.userPortfolio.volatility * 100).toFixed(2)}%
    - Sharpe Ratio: ${results.userPortfolio.sharpeRatio.toFixed(2)}
    
    Zadanie:
    1. Oceń dywersyfikację sektorową.
    2. Wskaż najsłabsze ogniwo (najniższy Sharpe marginalny).
    3. Zaproponuj konkretne zmiany wag dla poprawy stabilności.
    Odpowiedz w Markdown po polsku.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 2000 } }
    });
    return response.text || "Błąd analizy.";
  } catch (error) {
    return "Analiza AI obecnie niedostępna.";
  }
}

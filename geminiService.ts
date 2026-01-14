
import { GoogleGenAI } from "@google/genai";
import { OptimizationResults, Asset } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAiPortfolioAnalysis(assets: Asset[], results: OptimizationResults): Promise<string> {
  const prompt = `
    Działaj jako ekspert ds. inwestycji na rynku brytyjskim (LSE) i specjalista od teorii Markowitza.
    
    Analizowany portfel (spółki dywidendowe):
    ${assets.map(a => `${a.ticker}: Waga ${(a.weight * 100).toFixed(2)}%, Zwrot ${(a.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(a.volatility * 100).toFixed(2)}%, Dywidenda: ${(a.dividendYield * 100).toFixed(2)}%`).join('\n')}
    
    Wyniki obliczeń matematycznych:
    - Portfel Użytkownika: Zwrot Total ${(results.userPortfolio.expectedReturn * 100).toFixed(2)}% (w tym dywidenda ok. ${(results.userPortfolio.dividendYield! * 100).toFixed(2)}%), Ryzyko ${(results.userPortfolio.volatility * 100).toFixed(2)}%, Sharpe: ${results.userPortfolio.sharpeRatio.toFixed(2)}
    - Portfel Max Sharpe: Zwrot ${(results.maxSharpePortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.maxSharpePortfolio.volatility * 100).toFixed(2)}%
    
    Zadanie:
    1. Oceń obecne wagi pod kątem "Dividend Growth" oraz stabilności wypłat.
    2. Zaproponuj konkretne wagi, które balansują wysoki Yield (np. z Phoenix czy M&G) z bezpieczeństwem (Unilever/National Grid) i wzrostem (Shell).
    3. Wskaż, czy pogoń za najwyższą dywidendą w tym zestawieniu nie psuje zbytnio wskaźnika Sharpe'a (efektywności).
    
    Odpowiedz po polsku. Użyj Markdown, pogrubień i profesjonalnego tonu.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Analiza niedostępna.";
  } catch (error) {
    console.error("AI Analysis error:", error);
    return "Błąd podczas generowania analizy AI.";
  }
}


import { GoogleGenAI } from "@google/genai";
import { OptimizationResults, Asset } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAiPortfolioAnalysis(assets: Asset[], results: OptimizationResults): Promise<string> {
  const prompt = `
    Działaj jako ekspert ds. inwestycji na rynku brytyjskim (LSE) i specjalista od teorii Markowitza.
    
    Analizowany portfel (spółki dywidendowe):
    ${assets.map(a => `${a.ticker}: Waga ${(a.weight * 100).toFixed(2)}%, Zwrot ${(a.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(a.volatility * 100).toFixed(2)}%`).join('\n')}
    
    Wyniki obliczeń matematycznych:
    - Portfel Użytkownika: Zwrot ${(results.userPortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.userPortfolio.volatility * 100).toFixed(2)}%, Sharpe: ${results.userPortfolio.sharpeRatio.toFixed(2)}
    - Portfel Minimalnego Ryzyka (Min Risk): Zwrot ${(results.minRiskPortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.minRiskPortfolio.volatility * 100).toFixed(2)}%
    - Portfel Optymalny (Max Sharpe): Zwrot ${(results.maxSharpePortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.maxSharpePortfolio.volatility * 100).toFixed(2)}%
    
    Zadanie:
    1. Oceń obecne wagi. Czy przewaga Unilever i National Grid (spółki defensywne) jest uzasadniona przy obecnej alokacji w Shell i spółki finansowe?
    2. Zaproponuj konkretne, "idealne" wagi, biorąc pod uwagę:
       - Maksymalizację stopy zwrotu przy akceptowalnym ryzyku.
       - Charakter dywidendowy spółek (np. stabilność National Grid vs wysoka stopa Phoenix Group).
       - Rebalansowanie w stronę punktu "Max Sharpe" na krzywej Markowitza.
    3. Wskaż, która spółka jest obecnie "najdroższa" w sensie ryzyka (wnosi najwięcej zmienności w stosunku do oferowanego zwrotu).
    
    Odpowiedz po polsku. Użyj profesjonalnego języka, Markdown, pogrubień i list punktowych.
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

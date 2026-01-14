
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResults, Asset } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function searchTickerData(ticker: string): Promise<Partial<Asset>> {
  const prompt = `Zidentyfikuj spółkę o tickerze: ${ticker}. 
    Zwróć dane finansowe potrzebne do modelu Markowitza w formacie JSON.
    Szacowany roczny zwrot (expectedReturn) jako ułamek (np. 0.15 dla 15%), 
    roczna zmienność (volatility) jako ułamek (np. 0.3 dla 30%),
    oraz stopa dywidendy (dividendYield) jako ułamek.
    Bazuj na danych historycznych i prognozach analityków.`;

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
    Działaj jako ekspert analizy portfelowej (teoria Markowitza i Sharpe'a).
    
    Portfel użytkownika:
    ${assets.map(a => `${a.ticker}: waga ${(a.weight * 100).toFixed(1)}%`).join(', ')}
    
    Parametry portfela:
    - Oczekiwany zwrot: ${(results.userPortfolio.expectedReturn * 100).toFixed(2)}%
    - Ryzyko (odchylenie standardowe): ${(results.userPortfolio.volatility * 100).toFixed(2)}%
    - Wskaźnik Sharpe'a: ${results.userPortfolio.sharpeRatio.toFixed(2)}
    
    Zadanie:
    1. Oceń dywersyfikację (czy korelacja między spółkami nie jest zbyt wysoka?).
    2. Odnieś się do "Granicy Efektywnej" – jak blisko niej znajduje się ten portfel?
    3. Czy portfel jest "agresywny" (wysoka beta) czy "defensywny" w rozumieniu modelu Sharpe'a?
    4. Podaj konkretną rekomendację zmiany wag, aby przesunąć portfel w górę i w lewo na mapie ryzyko-zysk.
    
    Odpowiedz w języku polskim, używając profesjonalnej terminologii (alfa, beta, dywersyfikacja, ryzyko specyficzne).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Analiza AI obecnie niedostępna.";
  }
}

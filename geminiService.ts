
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResults, Asset } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function searchTickerData(ticker: string): Promise<Partial<Asset>> {
  const prompt = `Zidentyfikuj spółkę o tickerze: ${ticker}. 
    Zwróć dane finansowe potrzebne do modelu Markowitza w formacie JSON.
    Szacowany roczny zwrot (expectedReturn) jako ułamek (np. 0.15 dla 15%), 
    roczna zmienność (volatility) jako ułamek (np. 0.3 dla 30%),
    oraz stopa dywidendy (dividendYield) jako ułamek.
    Bazuj na danych historycznych i prognozach analityków dla rynku USA/Globalnego.`;

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
    // Fallback values
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
    Działaj jako ekspert od inwestycji agresywnych, sektora Space, AI oraz nowoczesnych technologii (Growth Stocks).
    
    Analizowany portfel (High-Growth Tech):
    ${assets.map(a => `${a.ticker}: Waga ${(a.weight * 100).toFixed(2)}%, Oczekiwany Zwrot ${(a.expectedReturn * 100).toFixed(2)}%, Ryzyko (Zmienność) ${(a.volatility * 100).toFixed(2)}%`).join('\n')}
    
    Wyniki optymalizacji Markowitza:
    - Portfel Użytkownika: Zwrot Oczekiwany ${(results.userPortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.userPortfolio.volatility * 100).toFixed(2)}%, Wskaźnik Sharpe'a: ${results.userPortfolio.sharpeRatio.toFixed(2)}
    - Portfel Max Sharpe: Zwrot ${(results.maxSharpePortfolio.expectedReturn * 100).toFixed(2)}%, Ryzyko ${(results.maxSharpePortfolio.volatility * 100).toFixed(2)}%
    
    Zadanie:
    1. Przeanalizuj koncentrację ryzyka. Czy portfel nie jest zbyt zależny od jednego trendu (np. tylko AI lub tylko Space)?
    2. Skomentuj obecność "kotwic" takich jak GOOGL czy AMZN w zestawieniu z ekstremalnie zmiennymi spółkami jak ASTS czy IREN.
    3. Zaproponuj optymalne doważenie spółek, które poprawi wskaźnik Sharpe'a przy zachowaniu wysokiego potencjału wzrostu.
    4. Zwróć uwagę na specyficzne ryzyka sektorowe dla RKLB (Space) oraz IREN (Bitcoin mining/HPC).
    
    Odpowiedz po polsku. Użyj Markdown, profesjonalnej terminologii i zachowaj obiektywizm.
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

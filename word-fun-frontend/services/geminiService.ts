import { FlashcardData } from "../types";
import { fetchWithAuth } from "./apiClient";

import { getEnv } from "../constants";

const API_BASE_URL = getEnv('VITE_BACKEND_SERVICE_URL');
if (!API_BASE_URL) {
  throw new Error("Missing VITE_BACKEND_SERVICE_URL environment variable");
}

// --- GOOGLE APPS SCRIPT INTEGRATION (Unchanged) ---
export const fetchScriptData = async (scriptUrl: string, token?: string | null): Promise<any[]> => {
  // ... (keeping existing logic for CSV/Script fetching if needed, or we can just keep the helpers)
  // For brevity, I'm keeping the core logic but removing the GoogleGenAI part.
  const startTime = performance.now();
  try {
    let cleanUrl = scriptUrl.trim();
    const separator = cleanUrl.includes('?') ? '&' : '?';
    let urlWithParams = `${cleanUrl}${separator}action=read&t=${Date.now()}`;
    if (token) urlWithParams += `&token=${encodeURIComponent(token)}`;

    const response = await fetch(urlWithParams, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });
    const fetchEnd = performance.now();
    console.log(`[PERF] Google Script Network Request: ${(fetchEnd - startTime).toFixed(0)}ms`);

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.error) throw new Error("Script Error: " + json.error);
    return Array.isArray(json) ? json : [];
  } catch (error: any) {
    console.error("Error fetching script data:", error);
    throw error;
  }
};

// ... (Legacy CSV helpers can remain if used types) ...

// --- BACKEND AI INTEGRATION ---

export const generateSessionContent = async (
  profileId: string,
  sessionCards: FlashcardData[],
  allWords: string[]
): Promise<FlashcardData[]> => {

  // Find cards that need content (missing examples)
  const cardsToGenerate = sessionCards.filter(c =>
    !c.examples || c.examples.length === 0
  );

  if (cardsToGenerate.length === 0) {
    return sessionCards;
  }

  console.log(`Requesting backend generation for ${cardsToGenerate.length} words...`);
  const startTime = performance.now();

  try {
    // 1. Prepare payload
    // Backend expects { words: Word[], contextWords: string[] }
    // We map FlashcardData to partial Word objects
    const wordsPayload = cardsToGenerate.map(c => ({
      id: c.id,
      text: c.character, // Backend uses 'text'
      examples: []
    }));

    // Context: shuffle and take 50
    const contextWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, 50);

    // 2. Call Backend
    const response = await fetchWithAuth(`${API_BASE_URL}/api/profiles/${profileId}/ai/session`, {
      method: 'POST',
      body: JSON.stringify({
        words: wordsPayload,
        contextWords
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate session content: ${response.statusText}`);
    }

    const filledWords = await response.json() as any[]; // Backend returns Word[]

    const endTime = performance.now();
    console.log(`[PERF] Backend Session Generation: ${(endTime - startTime).toFixed(0)}ms`);

    // 3. Merge results
    const filledMap = new Map(filledWords.map(w => [w.text, w]));

    return sessionCards.map(card => {
      const filled = filledMap.get(card.character);
      if (filled && filled.examples) {
        return {
          ...card,
          examples: filled.examples.map((ex: any) => ({
            chinese: ex.chinese,
            english: ex.english || ''
          }))
        };
      }
      return card;
    });

  } catch (err) {
    console.error("Backend generation failed:", err);
    return sessionCards;
  }
};

export const generateSingleExample = async (
  profileId: string,
  character: string,
  existingExamples: string[],
  contextWords: string[] = [] // Default to empty
): Promise<string> => {
  const startTime = performance.now();
  console.log(`Requesting single example for ${character} with context...`);

  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/profiles/${profileId}/ai/example`, {
      method: 'POST',
      body: JSON.stringify({
        word: character,
        existingExamples,
        contextWords
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate example: ${response.statusText}`);
    }

    const data = await response.json();
    return data.example; // Backend returns { example: string }

  } catch (err) {
    console.error("Failed to generate single example", err);
    throw err;
  }
};
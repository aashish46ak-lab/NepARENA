// Browser-only scoreboard OCR. tesseract.js is lazy-loaded on demand so it
// never enters the SSR/server bundle or the initial client chunk.

export interface OcrScore {
  home: number;
  away: number;
  raw: string;
}

const SCORE_RE = /(\d{1,2})\s*[-:–—~x×]\s*(\d{1,2})/g;

export async function detectScoreFromImage(file: File): Promise<OcrScore | null> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    const text: string = data.text ?? "";
    for (const m of text.matchAll(SCORE_RE)) {
      const home = Number(m[1]);
      const away = Number(m[2]);
      // Sanity bound — eFootball scores are small numbers
      if (home > 30 || away > 30) continue;
      return { home, away, raw: m[0] };
    }
    return null;
  } finally {
    await worker.terminate();
  }
}
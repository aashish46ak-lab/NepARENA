/** Share / download helpers for arcade games */

export async function shareGameResult(opts: {
  title: string;
  text: string;
  url?: string;
}): Promise<{ ok: boolean; method: "native" | "clipboard" | "none" }> {
  const url =
    opts.url ??
    (typeof window !== "undefined" ? window.location.href : "https://neparena.xyz");
  const payload = { title: opts.title, text: opts.text, url };

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(payload);
      return { ok: true, method: "native" };
    }
  } catch {
    /* user cancelled or unsupported */
  }

  try {
    const line = `${opts.title}\n${opts.text}\n${url}`;
    await navigator.clipboard.writeText(line);
    return { ok: true, method: "clipboard" };
  } catch {
    return { ok: false, method: "none" };
  }
}

/** Render a simple result card PNG and trigger download */
export async function downloadGameResultCard(opts: {
  game: string;
  headline: string;
  lines: string[];
  filename?: string;
}): Promise<boolean> {
  try {
    const W = 720;
    const H = 960;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0a0a0a");
    g.addColorStop(0.55, "#0f172a");
    g.addColorStop(1, "#020617");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 18px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NEPARENA ARCADE", W / 2, 90);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "800 42px system-ui,sans-serif";
    ctx.fillText(opts.game, W / 2, 160);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 28px system-ui,sans-serif";
    wrapText(ctx, opts.headline, W / 2, 240, W - 120, 34);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "500 22px system-ui,sans-serif";
    let y = 340;
    for (const line of opts.lines) {
      ctx.fillText(line, W / 2, y);
      y += 40;
    }

    ctx.fillStyle = "#64748b";
    ctx.font = "500 18px system-ui,sans-serif";
    ctx.fillText("neparena.xyz", W / 2, H - 70);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = opts.filename ?? `neparena-${opts.game.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    a.click();
    return true;
  } catch {
    return false;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

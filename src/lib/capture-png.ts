/**
 * html2canvas-safe PNG capture.
 * Modern CSS (lab/oklch/color-mix) breaks html2canvas — flatten to rgb on clone.
 */
export async function captureElementPng(
  el: HTMLElement,
  opts?: { backgroundColor?: string; fileName?: string; scale?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const mod = await import("html2canvas").catch(() => null);
    if (!mod?.default) {
      return { ok: false, error: "Download not available (html2canvas missing)" };
    }

    const colorMap = new WeakMap<
      Element,
      { color: string; bg: string; border: string }
    >();
    const walkOrig = (node: Element) => {
      try {
        const cs = window.getComputedStyle(node);
        colorMap.set(node, {
          color: cs.color || "#ffffff",
          bg: cs.backgroundColor || "transparent",
          border: cs.borderColor || "transparent",
        });
      } catch {
        /* ignore */
      }
      for (const c of Array.from(node.children)) walkOrig(c);
    };
    walkOrig(el);

    const canvas = await mod.default(el, {
      backgroundColor: opts?.backgroundColor ?? "#070b14",
      scale: opts?.scale ?? 2,
      useCORS: true,
      logging: false,
      foreignObjectRendering: false,
      onclone: (_doc, cloned) => {
        const flatten = (orig: Element, clone: Element) => {
          const h = clone as HTMLElement;
          const mapped = colorMap.get(orig);
          try {
            h.style.setProperty("color", mapped?.color ?? "#f5f5f5", "important");
            const bg = mapped?.bg ?? "transparent";
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
              h.style.setProperty("background-color", bg, "important");
            }
            if (mapped?.border) {
              h.style.setProperty("border-color", mapped.border, "important");
            }
            h.style.setProperty("box-shadow", "none", "important");
            h.style.setProperty("text-shadow", "none", "important");
            h.style.setProperty("filter", "none", "important");
            h.style.setProperty("backdrop-filter", "none", "important");
            h.style.setProperty("background-image", "none", "important");
          } catch {
            /* ignore */
          }
          const oKids = Array.from(orig.children);
          const cKids = Array.from(clone.children);
          for (let i = 0; i < cKids.length; i++) {
            if (oKids[i]) flatten(oKids[i]!, cKids[i]!);
          }
        };
        flatten(el, cloned);
      },
    });

    const a = document.createElement("a");
    a.download = opts?.fileName ?? "capture.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Download failed";
    if (/lab|oklch|color function/i.test(msg)) {
      return {
        ok: false,
        error:
          "Browser color format not supported for export — try Chrome/Safari update",
      };
    }
    return { ok: false, error: msg };
  }
}

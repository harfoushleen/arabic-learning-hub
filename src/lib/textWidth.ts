let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Rendered width of vowelled text in Noto Naskh Arabic 700 at `fontPx`. */
export function textWidth(text: string, fontPx: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontPx * 0.6;
  measureCtx.font = `700 ${fontPx}px "Noto Naskh Arabic", serif`;
  return measureCtx.measureText(text).width;
}

/**
 * Utility for detecting background color, brightness/luminance,
 * and automatically determining whether text should be light or dark for maximum readability.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses any color format (hex, rgb, rgba, hsl) into RGB numbers (0-255).
 */
export function parseColorToRgb(color: string): RGB | null {
  if (!color || typeof color !== 'string') return null;
  const cleanColor = color.trim().toLowerCase();

  // Hex 3-digit (#fff) or 6-digit (#ffffff) or 8-digit (#ffffff80)
  if (cleanColor.startsWith('#')) {
    const hex = cleanColor.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
  }

  // RGB or RGBA: rgb(255, 255, 255) or rgba(0, 0, 0, 0.5)
  const rgbMatch = cleanColor.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgbMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    };
  }

  // HSL: hsl(210, 100%, 50%)
  const hslMatch = cleanColor.match(/hsla?\((\d+)[,\s]+(\d+)%?[,\s]+(\d+)%?/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360;
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  // Common named colors fallback
  const namedColors: Record<string, RGB> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    transparent: { r: 0, g: 0, b: 0 },
    blue: { r: 37, g: 99, b: 235 },
    indigo: { r: 79, g: 70, b: 229 },
    slate: { r: 30, g: 41, b: 59 },
    zinc: { r: 24, g: 24, b: 27 },
  };

  return namedColors[cleanColor] || null;
}

/**
 * Calculates standard perceived relative luminance / brightness (0 - 255)
 * using the ITU-R BT.601 / W3C formula: Y = 0.299*R + 0.587*G + 0.114*B
 */
export function calculateLuminance(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Blends base color with an overlay color given the overlay opacity (0 - 1).
 */
export function blendRgb(base: RGB, overlay: RGB, overlayOpacity: number): RGB {
  const alpha = Math.max(0, Math.min(1, overlayOpacity));
  return {
    r: Math.round(base.r * (1 - alpha) + overlay.r * alpha),
    g: Math.round(base.g * (1 - alpha) + overlay.g * alpha),
    b: Math.round(base.b * (1 - alpha) + overlay.b * alpha),
  };
}

/**
 * Extracts multiple colors from a CSS gradient string and computes the average RGB.
 */
export function parseGradientAverageRgb(gradientStr: string): RGB {
  const hexMatches = gradientStr.match(/#[0-9a-fA-F]{3,8}/g) || [];
  const rgbMatches = gradientStr.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g) || [];

  const foundRgbs: RGB[] = [];
  for (const h of hexMatches) {
    const parsed = parseColorToRgb(h);
    if (parsed) foundRgbs.push(parsed);
  }
  for (const r of rgbMatches) {
    const parsed = parseColorToRgb(r);
    if (parsed) foundRgbs.push(parsed);
  }

  if (foundRgbs.length === 0) {
    // Default gradient assumption: dark navy blue
    return { r: 30, g: 41, b: 59 };
  }

  const total = foundRgbs.reduce(
    (acc, curr) => ({
      r: acc.r + curr.r,
      g: acc.g + curr.g,
      b: acc.b + curr.b,
    }),
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(total.r / foundRgbs.length),
    g: Math.round(total.g / foundRgbs.length),
    b: Math.round(total.b / foundRgbs.length),
  };
}

/**
 * Asynchronously calculates the average brightness of an image using canvas sampling.
 * Returns luminance (0 - 255).
 */
export function sampleImageLuminance(imageUrl: string): Promise<number> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(40); // default to dark
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    const timeout = setTimeout(() => {
      resolve(40);
    }, 2000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 30;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(40);
          return;
        }

        ctx.drawImage(img, 0, 0, 30, 30);
        const imgData = ctx.getImageData(0, 0, 30, 30).data;
        let totalLum = 0;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }

        resolve(count > 0 ? totalLum / count : 40);
      } catch {
        resolve(40); // Fallback for CORS or canvas errors
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(40);
    };
  });
}

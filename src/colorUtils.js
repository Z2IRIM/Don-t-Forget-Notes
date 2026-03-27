function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeHex(input) {
  const value = String(input || "")
    .trim()
    .replace(/^#/, "")
    .replace(/[^0-9a-f]/gi, "")
    .toLowerCase();

  if (value.length === 3) {
    return `#${value
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }

  if (value.length === 6) {
    return `#${value}`;
  }

  return null;
}

export function hexToRgb(hex) {
  const normalized = sanitizeHex(hex);
  if (!normalized) {
    return null;
  }

  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const channels = [r, g, b].map((channel) =>
    clamp(Math.round(Number(channel) || 0), 0, 255)
      .toString(16)
      .padStart(2, "0"),
  );

  return `#${channels.join("")}`;
}

export function rgbToHsl(r, g, b) {
  const red = clamp(Number(r) || 0, 0, 255) / 255;
  const green = clamp(Number(g) || 0, 0, 255) / 255;
  const blue = clamp(Number(b) || 0, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hueToRgb(p, q, t) {
  let value = t;

  if (value < 0) {
    value += 1;
  }
  if (value > 1) {
    value -= 1;
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }
  if (value < 1 / 2) {
    return q;
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }
  return p;
}

export function hslToRgb(h, s, l) {
  const hue = ((Number(h) || 0) % 360 + 360) % 360 / 360;
  const saturation = clamp(Number(s) || 0, 0, 100) / 100;
  const lightness = clamp(Number(l) || 0, 0, 100) / 100;

  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return { r: channel, g: channel, b: channel };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  };
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function isDarkColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false;
  }

  const luminance =
    (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.54;
}

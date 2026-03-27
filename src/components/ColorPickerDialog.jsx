import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value, fallback = "#7c4dff") {
  const raw = String(value || "")
    .trim()
    .replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((item) => `${item}${item}`)
      .join("")
      .toLowerCase()}`;
  }
  return fallback;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (channel) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / delta) % 6);
        break;
      case gn:
        h = 60 * ((bn - rn) / delta + 2);
        break;
      default:
        h = 60 * ((rn - gn) / delta + 4);
        break;
    }
  }

  if (h < 0) {
    h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (hue < 60) {
    rn = chroma;
    gn = x;
  } else if (hue < 120) {
    rn = x;
    gn = chroma;
  } else if (hue < 180) {
    gn = chroma;
    bn = x;
  } else if (hue < 240) {
    gn = x;
    bn = chroma;
  } else if (hue < 300) {
    rn = x;
    bn = chroma;
  } else {
    rn = chroma;
    bn = x;
  }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

export function ColorPickerDialog({
  open,
  title,
  value,
  presets = [],
  onClose,
  onChange,
}) {
  const [draft, setDraft] = useState(normalizeHex(value));
  const [hexInput, setHexInput] = useState(normalizeHex(value));

  useEffect(() => {
    if (!open) {
      return;
    }
    const normalized = normalizeHex(value);
    setDraft(normalized);
    setHexInput(normalized);
  }, [open, value]);

  const hsl = useMemo(() => rgbToHsl(hexToRgb(draft)), [draft]);

  const commitHexInput = () => {
    const normalized = normalizeHex(hexInput, draft);
    setDraft(normalized);
    setHexInput(normalized);
  };

  const updateFromHsl = (patch) => {
    const next = {
      ...hsl,
      ...patch,
    };
    const nextHex = rgbToHex(hslToRgb(next));
    setDraft(nextHex);
    setHexInput(nextHex);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Box
            sx={{
              height: 72,
              borderRadius: 3,
              bgcolor: draft,
              border: "1px solid",
              borderColor: "divider",
            }}
          />

          {presets.length ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {presets.map((color) => {
                const normalized = normalizeHex(color);
                const active = normalized === draft;
                return (
                  <Box
                    key={normalized}
                    onClick={() => {
                      setDraft(normalized);
                      setHexInput(normalized);
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      bgcolor: normalized,
                      cursor: "pointer",
                      border: active
                        ? "3px solid white"
                        : "1px solid rgba(255,255,255,0.28)",
                      boxShadow: active
                        ? "0 0 0 2px rgba(124,77,255,0.72)"
                        : "none",
                    }}
                  />
                );
              })}
            </Stack>
          ) : null}

          <TextField
            label="HEX"
            value={hexInput}
            onChange={(event) => setHexInput(event.target.value)}
            onBlur={commitHexInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitHexInput();
              }
            }}
            inputProps={{ spellCheck: false }}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              色相 {hsl.h}
            </Typography>
            <Slider
              value={hsl.h}
              min={0}
              max={360}
              onChange={(_event, nextValue) =>
                updateFromHsl({ h: Number(nextValue) })
              }
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              饱和度 {hsl.s}%
            </Typography>
            <Slider
              value={hsl.s}
              min={0}
              max={100}
              onChange={(_event, nextValue) =>
                updateFromHsl({ s: Number(nextValue) })
              }
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              亮度 {hsl.l}%
            </Typography>
            <Slider
              value={hsl.l}
              min={0}
              max={100}
              onChange={(_event, nextValue) =>
                updateFromHsl({ l: Number(nextValue) })
              }
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={() => {
            const normalized = normalizeHex(hexInput, draft);
            onChange?.(normalized);
            onClose?.();
          }}
        >
          应用
        </Button>
      </DialogActions>
    </Dialog>
  );
}

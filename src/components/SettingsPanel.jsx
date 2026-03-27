import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ACCENT_PRESETS, NOTE_VARIANTS } from "../noteStyles";

export function SettingsPanel({ settings }) {
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState("已保存");
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef("");
  const destroyedRef = useRef(false);
  const incomingJson = useMemo(() => JSON.stringify(settings), [settings]);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (incomingJson === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = incomingJson;
    setDraft(settings);
    setStatus("已保存");
  }, [incomingJson, settings]);

  const schedulePersist = (nextDraft) => {
    const serialized = JSON.stringify(nextDraft);
    setDraft(nextDraft);

    if (serialized === lastSavedRef.current) {
      setStatus("已保存");
      clearTimeout(saveTimerRef.current);
      return;
    }

    setStatus("未保存");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setStatus("保存中…");
        await window.desktopApi.updateSettings(nextDraft);
        lastSavedRef.current = serialized;
        if (!destroyedRef.current) {
          setStatus("已保存");
        }
      } catch (error) {
        if (!destroyedRef.current) {
          setStatus("保存失败");
        }
      }
    }, 500);
  };

  const updateField = (patch) => {
    const nextDraft = {
      ...draft,
      ...patch,
    };
    schedulePersist(nextDraft);
  };

  const rowSwitch = (label, key) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
    >
      <Box>
        <Typography fontWeight={600}>{label}</Typography>
      </Box>
      <Switch
        checked={Boolean(draft[key])}
        onChange={(event) => updateField({ [key]: event.target.checked })}
      />
    </Stack>
  );

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">应用设置</Typography>
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
        </Stack>

        <Stack spacing={2.5}>
          <TextField
            select
            label="主题模式"
            value={draft.themeMode}
            onChange={(event) => updateField({ themeMode: event.target.value })}
          >
            {/* <MenuItem value="system">跟随系统</MenuItem> */}
            {/* <MenuItem value="light">浅色</MenuItem> */}
            <MenuItem value="dark">深色</MenuItem>
          </TextField>

          {rowSwitch("开机自启动", "launchAtLogin")}
          {rowSwitch("启动后静默运行", "startHidden")}
          {rowSwitch("关闭主窗口时最小化到托盘", "closeToTray")}
          {rowSwitch("隐藏主窗口任务栏图标", "hideMainWindowTaskbar")}
          {rowSwitch("隐藏桌面便签任务栏图标", "hideWidgetTaskbar")}

          <TextField
            select
            label="新便签默认风格"
            value={draft.defaultStyle}
            onChange={(event) =>
              updateField({ defaultStyle: event.target.value })
            }
          >
            {NOTE_VARIANTS.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Typography fontWeight={600} sx={{ mb: 1 }}>
              新便签默认强调色
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {ACCENT_PRESETS.map((color) => (
                <Box
                  key={color}
                  onClick={() => updateField({ defaultAccentColor: color })}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: color,
                    borderRadius: "50%",
                    cursor: "pointer",
                    border:
                      draft.defaultAccentColor === color
                        ? "3px solid white"
                        : "1px solid rgba(255,255,255,0.3)",
                    boxShadow:
                      draft.defaultAccentColor === color
                        ? "0 0 0 2px rgba(124,77,255,0.7)"
                        : "none",
                  }}
                />
              ))}
              <Box
                component="label"
                sx={{ display: "inline-flex", cursor: "pointer" }}
              >
                <input
                  type="color"
                  value={draft.defaultAccentColor}
                  onChange={(event) =>
                    updateField({ defaultAccentColor: event.target.value })
                  }
                  style={{
                    width: 30,
                    height: 30,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                  }}
                />
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          桌面管理
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
        >
          <Button
            variant="contained"
            onClick={() => window.desktopApi.showAllWidgets()}
          >
            显示全部便签
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.desktopApi.hideAllWidgets()}
          >
            隐藏全部便签
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => window.desktopApi.unfreezeAllWidgets()}
          >
            解冻全部便签
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

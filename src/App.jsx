import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { buildAppTheme } from "./theme";
import { resolveThemeMode } from "./utils";
import { ManagerView } from "./components/ManagerView";
import { WidgetView } from "./components/WidgetView";

export default function App() {
  const widgetId = useMemo(
    () => new URLSearchParams(window.location.search).get("widgetId"),
    [],
  );
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [state, setState] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [widgetNoteSnapshot, setWidgetNoteSnapshot] = useState(null);

  useEffect(() => {
    let mounted = true;

    window.desktopApi.getState().then((nextState) => {
      if (!mounted) {
        return;
      }

      setState(nextState);

      if (widgetId) {
        setWidgetNoteSnapshot(
          nextState.notes.find((note) => note.id === widgetId) || null,
        );
      } else {
        setSelectedNoteId(
          (current) => current || nextState.notes[0]?.id || null,
        );
      }
    });

    const offState = window.desktopApi.onStateUpdated((nextState) => {
      setState(nextState);

      if (!widgetId) {
        return;
      }

      setWidgetNoteSnapshot(() => {
        const nextNote =
          nextState.notes.find((note) => note.id === widgetId) || null;
        return nextNote || null;
      });
    });

    const offSelect = window.desktopApi.onSelectNote((noteId) => {
      if (!widgetId) {
        setSelectedNoteId(noteId);
      }
    });

    return () => {
      mounted = false;
      offState?.();
      offSelect?.();
    };
  }, [widgetId]);

  useEffect(() => {
    if (widgetId || !state?.notes?.length) {
      return;
    }

    const exists = state.notes.some((note) => note.id === selectedNoteId);
    if (!exists) {
      setSelectedNoteId(state.notes[0].id);
    }
  }, [state, widgetId, selectedNoteId]);

  const resolvedMode = resolveThemeMode(
    state?.settings?.themeMode || "system",
    prefersDark,
  );
  const theme = useMemo(() => buildAppTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    const widgetMode = Boolean(widgetId);
    document.documentElement.dataset.widget = widgetMode ? "true" : "false";
    document.body.dataset.widget = widgetMode ? "true" : "false";
    document.documentElement.style.background = widgetMode
      ? "transparent"
      : theme.palette.background.default;
    document.body.style.background = widgetMode
      ? "transparent"
      : theme.palette.background.default;
  }, [widgetId, theme]);

  if (!state) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme={!widgetId} />
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography>正在加载 Material Notes Desktop…</Typography>
          </Stack>
        </Box>
      </ThemeProvider>
    );
  }

  const widgetNote = widgetId
    ? widgetNoteSnapshot ||
      state.notes.find((note) => note.id === widgetId) ||
      null
    : null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme={!widgetId} />
      {widgetId ? (
        <WidgetView
          key={`${widgetNote?.id || "empty"}-${widgetNote?.widget?.frozen ? "frozen" : "live"}-${widgetNote?.widget?.width || 0}-${widgetNote?.widget?.height || 0}`}
          note={widgetNote}
        />
      ) : (
        <ManagerView
          state={state}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
        />
      )}
    </ThemeProvider>
  );
}

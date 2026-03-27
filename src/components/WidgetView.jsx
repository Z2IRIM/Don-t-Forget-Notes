import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { buildNoteSurface } from "../noteStyles";

const RESIZE_DIRECTIONS = ["n", "s", "e", "w", "nw", "ne", "sw", "se"];
const WIDGET_RADIUS = "0px";

function computeBounds(direction, startBounds, dx, dy) {
  const next = { ...startBounds };

  if (direction.includes("e")) {
    next.width = startBounds.width + dx;
  }
  if (direction.includes("s")) {
    next.height = startBounds.height + dy;
  }
  if (direction.includes("w")) {
    next.x = startBounds.x + dx;
    next.width = startBounds.width - dx;
  }
  if (direction.includes("n")) {
    next.y = startBounds.y + dy;
    next.height = startBounds.height - dy;
  }

  return next;
}

export function WidgetView({ note }) {
  const theme = useTheme();
  const surface = useMemo(
    () => buildNoteSurface(note, theme.palette.mode),
    [note, theme.palette.mode],
  );
  const widgetBackground = surface.widgetBackground || surface.background;
  const [resizeState, setResizeState] = useState(null);

  useEffect(() => {
    if (!resizeState || !note) {
      return undefined;
    }

    const onMove = (event) => {
      const dx = event.screenX - resizeState.startX;
      const dy = event.screenY - resizeState.startY;
      const nextBounds = computeBounds(
        resizeState.direction,
        resizeState.startBounds,
        dx,
        dy,
      );
      window.desktopApi.setWidgetBounds(note.id, nextBounds);
    };

    const onUp = () => {
      setResizeState(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizeState, note]);

  const beginResize = async (direction, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!note || note.widget.frozen) {
      return;
    }

    const bounds = await window.desktopApi.getWidgetBounds(note.id);
    if (!bounds) {
      return;
    }

    setResizeState({
      direction,
      startX: event.screenX,
      startY: event.screenY,
      startBounds: bounds,
    });
  };

  if (!note) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          bgcolor: "transparent",
          color: "#ffffff",
        }}
      >
        <Typography>便签不存在</Typography>
      </Box>
    );
  }

  const [renderTick, setRenderTick] = useState(0);
  useEffect(() => {
    setRenderTick((v) => v + 1);
  }, [note?.widget?.frozen, note?.widget?.width, note?.widget?.height]);

  return (
    <Box
      key={renderTick}
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: widgetBackground,
        p: 0,
        m: 0,
        overflow: "hidden",
        borderRadius: WIDGET_RADIUS,
        isolation: "isolate",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: WIDGET_RADIUS,
          background: widgetBackground,
          color: surface.color,
          border: "none",
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          ...(note.style === "paper"
            ? {
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage:
                    "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.20) 0, rgba(255,255,255,0.0) 46%), radial-gradient(circle at 76% 66%, rgba(120,92,52,0.10) 0, rgba(120,92,52,0.0) 52%), repeating-linear-gradient(0deg, rgba(100,84,58,0.035) 0, rgba(100,84,58,0.035) 1px, rgba(255,255,255,0.0) 1px, rgba(255,255,255,0.0) 3px)",
                  opacity: 0.55,
                  mixBlendMode: "multiply",
                },
              }
            : null),
        }}
      >
        {!note.widget.frozen &&
          RESIZE_DIRECTIONS.map((direction) => (
            <Box
              key={direction}
              className={`resize-handle ${direction}`}
              onMouseDown={(event) => beginResize(direction, event)}
            />
          ))}

        {!note.widget.frozen ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            className="drag-region"
            sx={{
              px: 1.2,
              pt: 1,
              pb: 0.8,
              minHeight: 42,
              background: widgetBackground,
              borderBottom: "none",
              borderTopLeftRadius: WIDGET_RADIUS,
              borderTopRightRadius: WIDGET_RADIUS,
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
              zIndex: 2,
            }}
          >
            <>
              <Typography fontWeight={700} noWrap sx={{ maxWidth: "70%" }}>
                {note.title}
              </Typography>
              <Stack direction="row" spacing={0.4} className="no-drag">
                <Tooltip title="打开设置">
                  <IconButton
                    size="small"
                    onClick={() => window.desktopApi.showManager(note.id)}
                    sx={{ color: surface.color }}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="冻结">
                  <IconButton
                    size="small"
                    onClick={() =>
                      window.desktopApi.freezeWidget(note.id, true)
                    }
                    sx={{ color: surface.color }}
                  >
                    <LockRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="隐藏便签">
                  <IconButton
                    size="small"
                    onClick={() => window.desktopApi.hideWidget(note.id)}
                    sx={{ color: surface.color }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </>
          </Stack>
        ) : null}

        <Box
          className="widget-scroll-area"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: note.widget.frozen ? "hidden" : "auto",
            px: 2,
            py: note.widget.frozen ? 1.8 : 1.6,
            position: "relative",
            zIndex: 1,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              width: 0,
              height: 0,
              display: "none",
            },
          }}
        >
          <Box
            className="widget-rendered-content"
            sx={{
              fontSize: 15,
              lineHeight: 1.66,
              color: "inherit",
              "& a": {
                color: "inherit",
              },
              "& blockquote": {
                borderLeft: `4px solid ${surface.subtle}`,
                pl: 1.25,
                mx: 0,
                opacity: 0.88,
                borderRadius: WIDGET_RADIUS,
              },
              borderRadius: WIDGET_RADIUS,
            }}
            dangerouslySetInnerHTML={{ __html: note.html || "<p>空白便签</p>" }}
          />
        </Box>
      </Box>
    </Box>
  );
}

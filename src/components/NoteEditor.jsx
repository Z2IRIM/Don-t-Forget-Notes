import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddToHomeScreenRoundedIcon from "@mui/icons-material/AddToHomeScreenRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import PushPinRoundedIcon from "@mui/icons-material/PushPinRounded";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Markdown } from "@tiptap/markdown";
import { FormattingToolbar } from "./FormattingToolbar";
import { ACCENT_PRESETS, buildNoteSurface, NOTE_VARIANTS } from "../noteStyles";
import { ColorPickerDialog } from "./ColorPickerDialog";
import { ConfirmDialog } from "./ConfirmDialog";

function buildPersistPayload({
  title,
  html,
  markdown,
  style,
  accentColor,
  pinned,
  widgetSettings,
}) {
  return {
    title,
    html,
    markdown,
    style,
    accentColor,
    pinned,
    widget: {
      alwaysOnTop: Boolean(widgetSettings.alwaysOnTop),
      opacity: Number(widgetSettings.opacity || 0.96),
    },
  };
}

function getInitialWidgetSettings(note) {
  return {
    alwaysOnTop: Boolean(note.widget.alwaysOnTop),
    opacity: Number(note.widget.opacity || 0.96),
  };
}

export function NoteEditor({ note }) {
  const theme = useTheme();
  const [title, setTitle] = useState(note.title);
  const [style, setStyle] = useState(note.style);
  const [accentColor, setAccentColor] = useState(note.accentColor);
  const [pinned, setPinned] = useState(Boolean(note.pinned));
  const [widgetSettings, setWidgetSettings] = useState(
    getInitialWidgetSettings(note),
  );
  const [opacityDraft, setOpacityDraft] = useState(
    Number(note.widget.opacity || 0.96),
  );
  const [markdownDraft, setMarkdownDraft] = useState(note.markdown || "");
  const [saveLabel, setSaveLabel] = useState("已保存");
  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const titleRef = useRef(note.title);
  const htmlRef = useRef(note.html || "<p></p>");
  const markdownRef = useRef(note.markdown || "");
  const styleRef = useRef(note.style);
  const accentColorRef = useRef(note.accentColor);
  const pinnedRef = useRef(Boolean(note.pinned));
  const widgetSettingsRef = useRef(getInitialWidgetSettings(note));
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef("");
  const destroyedRef = useRef(false);
  const savingRef = useRef(false);
  const currentNoteIdRef = useRef(note.id);
  const lastSyncedNoteIdRef = useRef(null);

  const persistDraft = async ({ silent = false } = {}) => {
    const payload = buildPersistPayload({
      title: titleRef.current,
      html: htmlRef.current,
      markdown: markdownRef.current,
      style: styleRef.current,
      accentColor: accentColorRef.current,
      pinned: pinnedRef.current,
      widgetSettings: widgetSettingsRef.current,
    });

    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedRef.current) {
      if (!silent && !destroyedRef.current) {
        setSaveLabel("已保存");
      }
      return;
    }

    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    const noteIdAtSaveStart = currentNoteIdRef.current;

    try {
      if (!silent && !destroyedRef.current) {
        setSaveLabel("保存中");
      }

      await window.desktopApi.updateNote(noteIdAtSaveStart, payload);

      lastSavedRef.current = serialized;

      if (
        !silent &&
        !destroyedRef.current &&
        currentNoteIdRef.current === noteIdAtSaveStart
      ) {
        setSaveLabel("已保存");
      }
    } catch (error) {
      console.error("persistDraft failed:", error);

      if (
        !silent &&
        !destroyedRef.current &&
        currentNoteIdRef.current === noteIdAtSaveStart
      ) {
        setSaveLabel("保存失败");
      }
    } finally {
      savingRef.current = false;
    }
  };

  const persistNow = async ({ silent = false } = {}) => {
    clearTimeout(saveTimerRef.current);
    await persistDraft({ silent });
  };

  const schedulePersist = () => {
    if (!destroyedRef.current) {
      setSaveLabel("未保存");
    }
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistDraft();
    }, 1500);
  };

  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Markdown.configure({
        markedOptions: {
          gfm: true,
          breaks: false,
        },
      }),
    ],
    [],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: note.html || "<p></p>",
      editorProps: {
        attributes: {
          class: "tiptap",
        },
      },
      shouldRerenderOnTransaction: false,
      onUpdate({ editor: currentEditor }) {
        htmlRef.current = currentEditor.getHTML();
        markdownRef.current =
          typeof currentEditor.getMarkdown === "function"
            ? currentEditor.getMarkdown()
            : markdownRef.current;

        schedulePersist();
      },
    },
    [note.id],
  );

  useEffect(() => {
    destroyedRef.current = false;
    currentNoteIdRef.current = note.id;
    lastSyncedNoteIdRef.current = null;

    const initialWidgetSettings = getInitialWidgetSettings(note);
    const initialPayload = buildPersistPayload({
      title: note.title,
      html: note.html || "<p></p>",
      markdown: note.markdown || "",
      style: note.style,
      accentColor: note.accentColor,
      pinned: Boolean(note.pinned),
      widgetSettings: initialWidgetSettings,
    });

    lastSavedRef.current = JSON.stringify(initialPayload);
    titleRef.current = note.title;
    htmlRef.current = note.html || "<p></p>";
    markdownRef.current = note.markdown || "";
    styleRef.current = note.style;
    accentColorRef.current = note.accentColor;
    pinnedRef.current = Boolean(note.pinned);
    widgetSettingsRef.current = initialWidgetSettings;

    setTitle(note.title);
    setStyle(note.style);
    setAccentColor(note.accentColor);
    setPinned(Boolean(note.pinned));
    setWidgetSettings(initialWidgetSettings);
    setOpacityDraft(initialWidgetSettings.opacity);
    setMarkdownDraft(note.markdown || "");
    setSaveLabel("已保存");

    clearTimeout(saveTimerRef.current);

    return () => {
      destroyedRef.current = true;
      clearTimeout(saveTimerRef.current);
    };
  }, [note.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (lastSyncedNoteIdRef.current === note.id) {
      return;
    }

    lastSyncedNoteIdRef.current = note.id;
    editor.commands.setContent(htmlRef.current || "<p></p>", false);
  }, [editor, note.id]);

  const surfacePreview = useMemo(
    () => buildNoteSurface({ style, accentColor }, theme.palette.mode),
    [style, accentColor, theme.palette.mode],
  );

  const visibleText = note.widget.visible ? "已显示到桌面" : "未显示到桌面";
  const frozenText = note.widget.frozen ? "冻结中" : "可交互";

  const applyMarkdownDraft = () => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(markdownDraft, { contentType: "markdown" });
    markdownRef.current = markdownDraft;
    schedulePersist();
  };

  const syncMarkdownFromEditor = () => {
    const latest =
      typeof editor?.getMarkdown === "function"
        ? editor.getMarkdown()
        : markdownRef.current;
    markdownRef.current = latest;
    setMarkdownDraft(latest);
  };

  const toggleWidgetVisibility = async () => {
    if (note.widget.visible) {
      await window.desktopApi.hideWidget(note.id);
    } else {
      await window.desktopApi.showWidget(note.id);
    }
  };

  const toggleFreeze = async () => {
    await window.desktopApi.freezeWidget(note.id, !note.widget.frozen);
  };

  const handleDelete = async () => {
    await window.desktopApi.deleteNote(note.id);
    setDeleteDialogOpen(false);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 360px" },
        gap: 2,
      }}
    >
      <Stack spacing={2}>
        <Paper sx={{ overflow: "hidden" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ p: 2 }}
            alignItems={{ md: "center" }}
          >
            <TextField
              value={title}
              onChange={(event) => {
                const next = event.target.value;
                titleRef.current = next;
                setTitle(next);
                schedulePersist();
              }}
              label="便签标题"
              fullWidth
            />
            <Stack
              direction="row"
              display="grid"
              spacing={2}
              alignItems="center"
              useFlexGap
              flexWrap="wrap"
            >
              <Chip
                label={visibleText}
                color={note.widget.visible ? "primary" : "default"}
              />
              <Chip
                label={frozenText}
                color={note.widget.frozen ? "warning" : "default"}
              />
              <Chip label={saveLabel} icon={<SaveRoundedIcon />} />
            </Stack>
          </Stack>
          <Divider />
          <Stack
            direction="row"
            spacing={1}
            sx={{ p: 1.5 }}
            useFlexGap
            flexWrap="wrap"
          >
            <Button
              variant={note.widget.visible ? "outlined" : "contained"}
              startIcon={
                note.widget.visible ? (
                  <VisibilityOffRoundedIcon />
                ) : (
                  <AddToHomeScreenRoundedIcon />
                )
              }
              onClick={toggleWidgetVisibility}
            >
              {note.widget.visible ? "从桌面隐藏" : "显示到桌面"}
            </Button>
            <Button
              variant="outlined"
              color={note.widget.frozen ? "warning" : "inherit"}
              startIcon={
                note.widget.frozen ? (
                  <LockOpenRoundedIcon />
                ) : (
                  <LockRoundedIcon />
                )
              }
              onClick={toggleFreeze}
              disabled={!note.widget.visible}
            >
              {note.widget.frozen ? "解除冻结" : "冻结"}
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteRoundedIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              删除
            </Button>
            <IconButton
              color={pinned ? "primary" : "default"}
              onClick={() => {
                const next = !pinnedRef.current;
                pinnedRef.current = next;
                setPinned(next);
                schedulePersist();
              }}
            >
              {pinned ? <PushPinRoundedIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          </Stack>
        </Paper>

        <Paper sx={{ overflow: "hidden" }}>
          <FormattingToolbar editor={editor} />
          <Box sx={{ minHeight: 360 }}>
            <EditorContent editor={editor} />
          </Box>
        </Paper>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography fontWeight={700}>Markdown 原文</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <TextField
                value={markdownDraft}
                onChange={(event) => setMarkdownDraft(event.target.value)}
                multiline
                minRows={10}
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={syncMarkdownFromEditor}>
                  从编辑器同步
                </Button>
                <Button variant="contained" onClick={applyMarkdownDraft}>
                  用 Markdown 覆盖编辑器
                </Button>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ pb: 2 }} variant="h6" gutterBottom>
            样式与外观
          </Typography>
          <Stack spacing={1.25}>
            <TextField
              select
              label="便签风格"
              value={style}
              onChange={(event) => {
                const next = event.target.value;
                styleRef.current = next;
                setStyle(next);
                void persistNow();
              }}
              fullWidth
            >
              {NOTE_VARIANTS.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                强调色
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {ACCENT_PRESETS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => {
                      accentColorRef.current = color;
                      setAccentColor(color);
                      void persistNow();
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: color,
                      cursor: "pointer",
                      border:
                        accentColor === color
                          ? "3px solid white"
                          : "1px solid rgba(255,255,255,0.36)",
                      boxShadow:
                        accentColor === color
                          ? `0 0 0 2px ${theme.palette.primary.main}`
                          : "none",
                    }}
                  />
                ))}
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setAccentPickerOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setAccentPickerOpen(true);
                    }
                  }}
                  sx={{
                    alignSelf: "flex-end",
                    width: 20,
                    height: 20,
                    borderRadius: "15%",
                    bgcolor: accentColor,
                    cursor: "pointer",
                  }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            ></Stack>

            <Box>
              <Typography fontWeight={600}>透明度</Typography>
              <Slider
                value={Number(opacityDraft || 0.96)}
                onChange={(_event, value) => setOpacityDraft(Number(value))}
                onChangeCommitted={(_event, value) => {
                  const next = {
                    ...widgetSettingsRef.current,
                    opacity: Number(value),
                  };
                  widgetSettingsRef.current = next;
                  setWidgetSettings(next);
                  setOpacityDraft(Number(value));
                  void persistNow();
                }}
                step={0.01}
                min={0.55}
                max={1}
              />
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              创建时间：{new Date(note.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最近修改：{new Date(note.updatedAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              便签 ID：{note.id}
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <ColorPickerDialog
        open={accentPickerOpen}
        title="自定义强调色"
        value={accentColor}
        presets={ACCENT_PRESETS}
        onClose={() => setAccentPickerOpen(false)}
        onChange={(nextColor) => {
          accentColorRef.current = nextColor;
          setAccentColor(nextColor);
          void persistNow();
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="删除便签"
        message={`确定删除便签“${title}”吗？`}
        confirmText="删除"
        confirmColor="error"
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}

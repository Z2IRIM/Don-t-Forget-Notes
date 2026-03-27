import React from "react";
import {
  Box,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import TitleRoundedIcon from "@mui/icons-material/TitleRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from "../noteStyles";

function ToolButton({ title, active, onClick, children }) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{
          borderRadius: 2,
          bgcolor: active ? "primary.main" : "transparent",
          color: active ? "primary.contrastText" : "text.secondary",
          "&:hover": {
            bgcolor: active ? "primary.dark" : "action.hover",
          },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function normalizeFontSize(value) {
  const raw = String(value || "")
    .trim()
    .replace(/px$/i, "");
  if (!raw) {
    return "";
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return `${Math.max(8, Math.min(160, parsed))}px`;
}

export function FormattingToolbar({ editor }) {
  if (!editor) {
    return null;
  }

  const currentTextStyle = editor.getAttributes("textStyle") || {};
  const currentFontSize = String(currentTextStyle.fontSize || "").replace(
    /px$/i,
    "",
  );

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("请输入链接地址", previousUrl);
    if (url === null) {
      return;
    }
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const applyFontFamily = (value) => {
    const next = String(value || "").trim();
    if (!next) {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }
    editor.chain().focus().setFontFamily(next).run();
  };

  const applyFontSize = (value) => {
    const next = normalizeFontSize(value);
    if (!next) {
      editor.chain().focus().unsetFontSize().run();
      return;
    }
    editor.chain().focus().setFontSize(next).run();
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ p: 1.25, borderBottom: 1, borderColor: "divider" }}
    >
      <Select
        size="small"
        value={currentTextStyle.fontFamily || ""}
        displayEmpty
        onChange={(event) => applyFontFamily(event.target.value)}
        sx={{ minWidth: 160, borderRadius: 2, fontSize: 14 }}
      >
        <MenuItem value="">系统字体</MenuItem>
        {FONT_OPTIONS.map((font) => (
          <MenuItem key={font} value={font} sx={{ fontFamily: font }}>
            {font}
          </MenuItem>
        ))}
      </Select>

      <Select
        size="small"
        value={currentTextStyle.fontSize || ""}
        displayEmpty
        onChange={(event) => applyFontSize(event.target.value)}
        sx={{ minWidth: 98, borderRadius: 2, fontSize: 14 }}
      >
        <MenuItem value="">默认字号</MenuItem>
        {FONT_SIZE_OPTIONS.map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </Select>

      <ToolButton
        title="粗体"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <FormatBoldRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="斜体"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <FormatItalicRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="下划线"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <FormatUnderlinedRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="标题"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <TitleRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="引用"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <FormatQuoteRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="代码块"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <CodeRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="链接"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkRoundedIcon fontSize="small" />
      </ToolButton>

      <Divider orientation="vertical" flexItem />

      <ToolButton
        title="无序列表"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <FormatListBulletedRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="有序列表"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <FormatListNumberedRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="任务列表"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckBoxRoundedIcon fontSize="small" />
      </ToolButton>

      <Divider orientation="vertical" flexItem />

      <ToolButton
        title="左对齐"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <FormatAlignLeftRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="居中"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <FormatAlignCenterRoundedIcon fontSize="small" />
      </ToolButton>
      <ToolButton
        title="右对齐"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <FormatAlignRightRoundedIcon fontSize="small" />
      </ToolButton>
    </Stack>
  );
}

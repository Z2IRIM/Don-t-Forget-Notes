import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ViewSidebarRoundedIcon from "@mui/icons-material/ViewSidebarRounded";
import { NoteEditor } from "./NoteEditor";
import { SettingsPanel } from "./SettingsPanel";

const drawerWidth = 340;

export function ManagerView({ state, selectedNoteId, onSelectNote }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("editor");

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return state.notes;
    }

    return state.notes.filter((note) => {
      const target = `${note.title} ${note.excerpt}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [search, state.notes]);

  const selectedNote = useMemo(() => {
    if (!filteredNotes.length) {
      return null;
    }

    return (
      filteredNotes.find((note) => note.id === selectedNoteId) ||
      filteredNotes[0] ||
      null
    );
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    if (selectedNote && selectedNote.id !== selectedNoteId) {
      onSelectNote(selectedNote.id);
    }
  }, [selectedNote, selectedNoteId, onSelectNote]);

  const handleCreate = async () => {
    const result = await window.desktopApi.createNote();
    if (result?.note?.id) {
      onSelectNote(result.note.id);
      setTab("editor");
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" noWrap>
              Don't Forget
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="搜索标题或正文…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <SearchRoundedIcon
                  fontSize="small"
                  style={{ marginRight: 8, opacity: 0.72 }}
                />
              ),
            }}
            sx={{ width: 320, maxWidth: "32vw" }}
          />
          <Tooltip title="新建便签">
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleCreate}
            >
              New
            </Button>
          </Tooltip>
          <Tooltip title="显示全部桌面便签">
            <IconButton onClick={() => window.desktopApi.showAllWidgets()}>
              <HomeRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="设置">
            <IconButton onClick={() => setTab("settings")}>
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            pt: 10,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 0, pb: 2 }}
        >
          <ViewSidebarRoundedIcon color="primary" />
          <Typography fontWeight={700}>便签列表</Typography>
          <Chip
            size="small"
            label={`${filteredNotes.length} / ${state.notes.length}`}
          />
        </Stack>
        <Divider />
        <List sx={{ px: 1, py: 1.25, overflow: "auto" }}>
          {filteredNotes.map((note) => (
            <ListItemButton
              key={note.id}
              selected={note.id === selectedNote?.id}
              onClick={() => {
                onSelectNote(note.id);
                setTab("editor");
              }}
              sx={{
                borderRadius: 1.5,
                mb: 1,
                alignItems: "flex-start",
                p: 1.5,
              }}
            >
              <Badge
                color="primary"
                variant={note.widget.visible ? "dot" : "standard"}
                overlap="circular"
                sx={{ mr: 1.25, mt: 0.25 }}
              >
                <Avatar
                  sx={{
                    bgcolor: note.accentColor,
                    width: 34,
                    height: 34,
                    fontSize: 15,
                  }}
                >
                  {note.title.slice(0, 1).toUpperCase()}
                </Avatar>
              </Badge>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Typography variant="body1" fontWeight={700} noWrap>
                      {note.title}
                    </Typography>
                    {note.pinned ? (
                      <Chip
                        size="small"
                        label="置顶"
                        color="primary"
                        variant="outlined"
                      />
                    ) : null}
                    {note.widget.frozen ? (
                      <Chip
                        size="small"
                        label="冻结"
                        color="warning"
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.6} sx={{ mt: 0.75 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.45 }}
                    >
                      {note.excerpt || "空白便签"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(note.updatedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, pt: 10, px: 3, pb: 3, overflow: "auto" }}
      >
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{ mb: 2 }}
        >
          <Tab label="编辑器" value="editor" />
          <Tab label="设置" value="settings" />
        </Tabs>

        {tab === "settings" ? (
          <SettingsPanel settings={state.settings} />
        ) : selectedNote ? (
          <NoteEditor key={selectedNote.id} note={selectedNote} />
        ) : (
          <Box
            sx={{
              minHeight: 420,
              borderRadius: 4,
              border: 1,
              borderColor: "divider",
              display: "grid",
              placeItems: "center",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1} alignItems="center">
              <Typography variant="h6">
                {search.trim() ? "没有找到匹配的便签" : "还没有可编辑的便签"}
              </Typography>
              {!search.trim() ? (
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleCreate}
                >
                  创建第一张便签
                </Button>
              ) : null}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}

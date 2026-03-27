const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  dialog,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

const APP_NAME = "Don't Forget Notes";
const isDev = !app.isPackaged;
const STATE_FILE = "material-notes-state.json";
const MIN_WIDGET_WIDTH = 260;
const MIN_WIDGET_HEIGHT = 180;
const WIDGET_RADIUS_PX = 20;

let state = null;
let tray = null;
let mainWindow = null;
let isQuitting = false;
const widgetWindows = new Map();
const boundsSaveTimers = new Map();

const DEFAULT_SETTINGS = {
  themeMode: "system",
  launchAtLogin: false,
  startHidden: true,
  closeToTray: true,
  hideMainWindowTaskbar: false,
  hideWidgetTaskbar: true,
  defaultStyle: "glass",
  defaultAccentColor: "#7c4dff",
  defaultOpacity: 0.96,
};

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(markdown = "") {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, "$1")
    .replace(/^\s{0,3}[#>*+-]\s?/gm, "")
    .replace(/^\s{0,3}\d+\.\s?/gm, "")
    .replace(/[\*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toExcerpt(note) {
  const source =
    stripMarkdown(note.markdown || "") || stripHtml(note.html || "");
  if (!source) {
    return "空白便签";
  }
  return source.slice(0, 120);
}

function baseWidget(partial = {}) {
  return {
    visible: false,
    frozen: false,
    x: null,
    y: null,
    width: 360,
    height: 260,
    opacity: DEFAULT_SETTINGS.defaultOpacity,
    alwaysOnTop: false,
    ...partial,
    width: Math.max(MIN_WIDGET_WIDTH, Number(partial.width ?? 360)),
    height: Math.max(MIN_WIDGET_HEIGHT, Number(partial.height ?? 260)),
  };
}

function defaultNote(partial = {}) {
  const now = new Date().toISOString();
  const markdown =
    partial.markdown ||
    "# 欢迎使用 Don't Forget Notes\n\n- 在左侧列表管理便签\n- 用富文本工具栏编辑正文\n- 点击“显示到桌面”生成桌面便签\n- 冻结后窗口会鼠标穿透\n";
  const html =
    partial.html ||
    "<h1>欢迎使用 Don't Forget Notes</h1><p>这是你的第一个桌面便签。</p><ul><li>左侧列表管理便签</li><li>用富文本工具栏编辑正文</li><li>点击“显示到桌面”生成桌面便签</li><li>冻结后窗口会鼠标穿透</li></ul>";

  const note = {
    id: crypto.randomUUID(),
    title: "欢迎使用 Don't Forget Notes",
    html,
    markdown,
    excerpt: "",
    style: partial.style || DEFAULT_SETTINGS.defaultStyle,
    accentColor: partial.accentColor || DEFAULT_SETTINGS.defaultAccentColor,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    widget: baseWidget(partial.widget),
    ...partial,
  };

  note.excerpt = toExcerpt(note);
  return note;
}

function normalizeNote(input) {
  const note = {
    ...defaultNote(),
    ...input,
    widget: baseWidget(input?.widget || {}),
  };

  note.title =
    String(note.title || "").trim() ||
    toExcerpt(note).slice(0, 24) ||
    "未命名便签";
  note.excerpt = toExcerpt(note);
  note.style = ["solid", "glass", "paper", "minimal"].includes(note.style)
    ? note.style
    : DEFAULT_SETTINGS.defaultStyle;
  note.accentColor = note.accentColor || DEFAULT_SETTINGS.defaultAccentColor;
  note.createdAt = note.createdAt || new Date().toISOString();
  note.updatedAt = note.updatedAt || note.createdAt;
  return note;
}

function normalizeState(raw) {
  const draft = raw && typeof raw === "object" ? raw : {};
  const notes = Array.isArray(draft.notes)
    ? draft.notes.map(normalizeNote)
    : [];
  const normalized = {
    settings: {
      ...DEFAULT_SETTINGS,
      ...(draft.settings || {}),
    },
    notes: notes.length ? notes : [defaultNote()],
  };

  normalized.notes.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return normalized;
}

function getStatePath() {
  return path.join(app.getPath("userData"), STATE_FILE);
}

function loadState() {
  try {
    const raw = fs.readFileSync(getStatePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return normalizeState(null);
  }
}

function saveState() {
  fs.mkdirSync(path.dirname(getStatePath()), { recursive: true });
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf8");
}

function broadcastState() {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send("state:updated", state);
    }
  });
  rebuildTrayMenu();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mutateState(mutator, options = {}) {
  const draft = deepClone(state);
  mutator(draft);
  state = normalizeState(draft);
  saveState();
  if (options.syncWindows !== false) {
    syncOpenWindows();
  }
  if (options.broadcast !== false) {
    broadcastState();
  }
  return state;
}

function getNoteById(noteId) {
  return state.notes.find((note) => note.id === noteId) || null;
}

function buildRendererUrl(params = {}) {
  const url = isDev
    ? new URL("http://localhost:5173")
    : pathToFileURL(path.join(__dirname, "..", "dist", "index.html"));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function createTrayImage() {
  // 这是一个紫色圆角方形的 Base64
  const base64Icon =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAArEAAAKxAFmbYLUAAAAqElEQVRYhe2VbQrCMBBEX5bSA+hh7CXEiwmll/EC9TiKHxcYKUTQsuifSITuwBLYhJ1HCJkkiZqyqu4EAAFAAJjTa4EeuAIqVNOsIc9+l6R57fU79XO/5PyEJ2AN7ICx0E13wAG4AKvXjeQAPBupkPnHuUZlWQAQAJVlAcDSARqnd85ZsAWOhXw2eZ2y4L/SEAegzQdvBY3vkoY8+2scL+sRWgAQANTVA9oXjFSpQgmGAAAAAElFTkSuQmCC";

  const image = nativeImage.createFromDataURL(base64Icon);
  return image.resize({ width: 16, height: 16 });
}

function rebuildTrayMenu() {
  if (!tray) {
    return;
  }

  const visibleCount = state.notes.filter((note) => note.widget.visible).length;
  const frozenCount = state.notes.filter((note) => note.widget.frozen).length;

  const menu = Menu.buildFromTemplate([
    {
      label: "打开设置",
      click: () => showManagerWindow(),
    },
    {
      label: "新建便签",
      click: async () => {
        const result = await createNote({ title: "新便签" });
        showManagerWindow(result.note.id);
      },
    },
    { type: "separator" },
    {
      label: `桌面便签：${visibleCount} 个`,
      enabled: false,
    },
    {
      label: `冻结便签：${frozenCount} 个`,
      enabled: false,
    },
    {
      label: "显示全部便签",
      click: () => showAllWidgets(),
    },
    {
      label: "隐藏全部便签",
      click: () => hideAllWidgets(),
    },
    {
      label: "解冻全部便签",
      click: () => unfreezeAllWidgets(),
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(APP_NAME);
  tray.setContextMenu(menu);
}

function createTray() {
  tray = new Tray(createTrayImage());
  tray.on("double-click", () => showManagerWindow());
  rebuildTrayMenu();
}

function saveWindowBounds(noteId, win) {
  const note = getNoteById(noteId);
  if (!note || !win || win.isDestroyed()) {
    return;
  }

  const bounds = win.getBounds();
  note.widget.x = bounds.x;
  note.widget.y = bounds.y;
  note.widget.width = bounds.width;
  note.widget.height = bounds.height;
  saveState();
}

function queueBoundsSave(noteId, win) {
  clearTimeout(boundsSaveTimers.get(noteId));
  const timer = setTimeout(() => {
    saveWindowBounds(noteId, win);
    boundsSaveTimers.delete(noteId);
  }, 120);
  boundsSaveTimers.set(noteId, timer);
}

function ensureWidgetPosition(note) {
  if (note.widget.x !== null && note.widget.y !== null) {
    return { x: note.widget.x, y: note.widget.y };
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { workArea } = display;
  return {
    x: Math.round(workArea.x + (workArea.width - note.widget.width) / 2),
    y: Math.round(workArea.y + (workArea.height - note.widget.height) / 2),
  };
}

function applyWidgetShape(win) {
  if (!win || win.isDestroyed() || typeof win.setShape !== "function") {
    return;
  }

  const { width, height } = win.getBounds();
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const r = Math.min(WIDGET_RADIUS_PX, Math.floor(w / 2), Math.floor(h / 2));

  if (r <= 0) {
    win.setShape([{ x: 0, y: 0, width: w, height: h }]);
    return;
  }

  const rects = [];
  for (let y = 0; y < h; y += 1) {
    const top = y;
    const bottom = h - 1 - y;
    let inset = 0;

    if (top < r) {
      const dy = r - top - 0.5;
      inset = Math.max(
        inset,
        Math.ceil(r - Math.sqrt(Math.max(0, r * r - dy * dy))),
      );
    }
    if (bottom < r) {
      const dy = r - bottom - 0.5;
      inset = Math.max(
        inset,
        Math.ceil(r - Math.sqrt(Math.max(0, r * r - dy * dy))),
      );
    }

    rects.push({ x: inset, y, width: Math.max(1, w - inset * 2), height: 1 });
  }

  win.setShape(rects);
}

function applyFrozenState(win, frozen) {
  try {
    if (frozen) {
      win.setIgnoreMouseEvents(true, { forward: true });
      win.setFocusable(false);
      win.setSkipTaskbar(true);
      return;
    }

    win.setIgnoreMouseEvents(false);
    win.setFocusable(true);
  } catch (error) {
    console.error("Failed to apply frozen state", error);
  }
}

function applyWidgetChrome(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  try {
    if (typeof win.removeMenu === "function") {
      win.removeMenu();
    }
    if (typeof win.setMenuBarVisibility === "function") {
      win.setMenuBarVisibility(false);
    }
    if (typeof win.setAutoHideMenuBar === "function") {
      win.setAutoHideMenuBar(true);
    }
    if (typeof win.setBackgroundColor === "function") {
      win.setBackgroundColor("#00000001");
    }
    if (typeof win.setHasShadow === "function") {
      win.setHasShadow(false);
    }
    applyWidgetShape(win);
  } catch (error) {
    console.error("Failed to apply widget chrome", error);
  }
}

function applyNoteWindowState(noteId) {
  const note = getNoteById(noteId);
  const win = widgetWindows.get(noteId);
  if (!note || !win || win.isDestroyed()) {
    return;
  }

  win.setSkipTaskbar(
    Boolean(state.settings.hideWidgetTaskbar || note.widget.frozen),
  );
  win.setAlwaysOnTop(Boolean(note.widget.alwaysOnTop), "screen-saver");

  // Transparent frameless windows on Windows can show composition artifacts
  // (white/bright bands) when opacity is below 1 and the window loses focus.
  win.setOpacity(note.widget.opacity);
  applyFrozenState(win, note.widget.frozen);
  applyWidgetShape(win);

  const current = win.getBounds();
  const expected = {
    x: note.widget.x ?? current.x,
    y: note.widget.y ?? current.y,
    width: Math.max(
      MIN_WIDGET_WIDTH,
      Number(note.widget.width || current.width),
    ),
    height: Math.max(
      MIN_WIDGET_HEIGHT,
      Number(note.widget.height || current.height),
    ),
  };

  if (
    current.x !== expected.x ||
    current.y !== expected.y ||
    current.width !== expected.width ||
    current.height !== expected.height
  ) {
    win.setBounds(expected);
  }
}

function syncOpenWindows() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSkipTaskbar(Boolean(state.settings.hideMainWindowTaskbar));
  }

  widgetWindows.forEach((win, noteId) => {
    if (win && !win.isDestroyed()) {
      applyNoteWindowState(noteId);
    }
  });
}

function closeWidgetWindow(noteId) {
  const win = widgetWindows.get(noteId);
  if (!win || win.isDestroyed()) {
    widgetWindows.delete(noteId);
    return;
  }
  win.__closingByApp = true;
  win.close();
}

function recreateWidgetWindow(noteId) {
  const existing = widgetWindows.get(noteId);
  if (existing && !existing.isDestroyed()) {
    existing.__closingByApp = true;
    saveWindowBounds(noteId, existing);
    widgetWindows.delete(noteId);
    clearTimeout(boundsSaveTimers.get(noteId));
    boundsSaveTimers.delete(noteId);
    existing.destroy();
  }

  return createWidgetWindow(noteId);
}

function createManagerWindow({ show = true } = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (show) {
      mainWindow.show();
      mainWindow.focus();
    }
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    backgroundColor: "#111827",
    title: APP_NAME,
    icon: path.join(__dirname, "icon-raw.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setSkipTaskbar(Boolean(state.settings.hideMainWindowTaskbar));

  mainWindow.on("close", (event) => {
    if (!isQuitting && state.settings.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(buildRendererUrl());

  mainWindow.once("ready-to-show", () => {
    if (show) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return mainWindow;
}

function createWidgetWindow(noteId) {
  const existing = widgetWindows.get(noteId);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    applyNoteWindowState(noteId);
    return existing;
  }

  const note = getNoteById(noteId);
  if (!note) {
    return null;
  }

  const position = ensureWidgetPosition(note);

  const win = new BrowserWindow({
    x: position.x,
    y: position.y,
    width: Math.max(MIN_WIDGET_WIDTH, note.widget.width),
    height: Math.max(MIN_WIDGET_HEIGHT, note.widget.height),
    minWidth: MIN_WIDGET_WIDTH,
    minHeight: MIN_WIDGET_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    thickFrame: false,
    movable: true,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    focusable: !note.widget.frozen,
    title: "",
    show: false,
    roundedCorners: false,
    skipTaskbar: Boolean(
      state.settings.hideWidgetTaskbar || note.widget.frozen,
    ),
    backgroundColor: "#00000001",
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widgetWindows.set(noteId, win);

  win.setTitle("");
  win.on("page-title-updated", (event) => {
    event.preventDefault();
    win.setTitle("");
  });

  win.on("move", () => queueBoundsSave(noteId, win));
  win.on("resize", () => {
    applyWidgetShape(win);
    queueBoundsSave(noteId, win);
  });
  win.on("close", () => saveWindowBounds(noteId, win));
  win.on("closed", () => {
    widgetWindows.delete(noteId);
    clearTimeout(boundsSaveTimers.get(noteId));
    boundsSaveTimers.delete(noteId);

    if (!isQuitting && !win.__closingByApp) {
      mutateState(
        (draft) => {
          const target = draft.notes.find((item) => item.id === noteId);
          if (target) {
            target.widget.visible = false;
            target.updatedAt = new Date().toISOString();
          }
        },
        { syncWindows: false },
      );
    }
  });

  win.loadURL(buildRendererUrl({ widgetId: noteId }));

  win.once("ready-to-show", () => {
    applyNoteWindowState(noteId);
    applyWidgetChrome(win);
    if (note.widget.frozen) {
      win.showInactive();
    } else {
      win.show();
    }
  });

  return win;
}

function showManagerWindow(noteId = null) {
  const win = createManagerWindow({ show: true });
  if (!win) {
    return;
  }

  if (noteId) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("manager:select-note", noteId);
      }
    }, 180);
  }
}

function restoreVisibleWidgets() {
  state.notes
    .filter((note) => note.widget.visible)
    .forEach((note) => {
      createWidgetWindow(note.id);
    });
}

function applyLoginItemSettings() {
  if (!app.isPackaged) {
    return;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(state.settings.launchAtLogin),
      args: state.settings.startHidden ? ["--hidden"] : [],
    });
  } catch (error) {
    console.error("Failed to apply login item settings", error);
  }
}

async function createNote(payload = {}) {
  const note = defaultNote({
    title: payload.title || "新便签",
    style: payload.style || state.settings.defaultStyle,
    accentColor: payload.accentColor || state.settings.defaultAccentColor,
    widget: {
      opacity: state.settings.defaultOpacity,
      visible: false,
      frozen: false,
      alwaysOnTop: false,
    },
  });

  mutateState((draft) => {
    draft.notes.unshift(note);
  });

  if (payload.showWidget) {
    mutateState((draft) => {
      const target = draft.notes.find((item) => item.id === note.id);
      if (target) {
        target.widget.visible = true;
      }
    });
    createWidgetWindow(note.id);
  }

  return { state, note: getNoteById(note.id) };
}

function updateNote(noteId, patch = {}) {
  let updated = null;
  mutateState((draft) => {
    const target = draft.notes.find((item) => item.id === noteId);
    if (!target) {
      return;
    }

    Object.assign(target, {
      ...patch,
      widget: {
        ...target.widget,
        ...(patch.widget || {}),
      },
      updatedAt: new Date().toISOString(),
    });

    if (patch.title !== undefined) {
      target.title = String(patch.title || "").trim() || target.title;
    }

    target.excerpt = toExcerpt(target);
    updated = target;
  });

  if (updated) {
    applyNoteWindowState(noteId);
  }

  return { state, note: updated ? getNoteById(noteId) : null };
}

function deleteNote(noteId) {
  closeWidgetWindow(noteId);
  mutateState((draft) => {
    draft.notes = draft.notes.filter((item) => item.id !== noteId);
  });
  return { state };
}

function duplicateNote(noteId) {
  const source = getNoteById(noteId);
  if (!source) {
    return { state, note: null };
  }

  const duplicated = defaultNote({
    title: `${source.title}（副本）`,
    html: source.html,
    markdown: source.markdown,
    style: source.style,
    accentColor: source.accentColor,
    pinned: source.pinned,
    widget: {
      ...source.widget,
      visible: false,
      frozen: false,
      x: null,
      y: null,
    },
  });

  mutateState((draft) => {
    draft.notes.unshift(duplicated);
  });

  return { state, note: getNoteById(duplicated.id) };
}

function showWidget(noteId) {
  mutateState(
    (draft) => {
      const target = draft.notes.find((item) => item.id === noteId);
      if (target) {
        target.widget.visible = true;
        target.updatedAt = new Date().toISOString();
      }
    },
    { syncWindows: false },
  );

  const win = recreateWidgetWindow(noteId);
  if (win) {
    applyNoteWindowState(noteId);
  }
  broadcastState();
  return { state, note: getNoteById(noteId) };
}

function hideWidget(noteId) {
  mutateState(
    (draft) => {
      const target = draft.notes.find((item) => item.id === noteId);
      if (target) {
        target.widget.visible = false;
        target.updatedAt = new Date().toISOString();
      }
    },
    { syncWindows: false, broadcast: false },
  );

  closeWidgetWindow(noteId);
  broadcastState();
  return { state, note: getNoteById(noteId) };
}

function freezeWidget(noteId, frozen) {
  mutateState((draft) => {
    const target = draft.notes.find((item) => item.id === noteId);
    if (target) {
      target.widget.frozen = Boolean(frozen);
      target.updatedAt = new Date().toISOString();
    }
  });
  const win = recreateWidgetWindow(noteId);
  if (win) {
    applyNoteWindowState(noteId);
  }
  return { state, note: getNoteById(noteId) };
}

function showAllWidgets() {
  mutateState(
    (draft) => {
      draft.notes.forEach((item) => {
        item.widget.visible = true;
      });
    },
    { syncWindows: false, broadcast: false },
  );

  state.notes.forEach((note) => createWidgetWindow(note.id));
  broadcastState();
  return { state };
}

function hideAllWidgets() {
  mutateState(
    (draft) => {
      draft.notes.forEach((item) => {
        item.widget.visible = false;
      });
    },
    { syncWindows: false, broadcast: false },
  );

  Array.from(widgetWindows.keys()).forEach((noteId) =>
    closeWidgetWindow(noteId),
  );
  broadcastState();
  return { state };
}

function unfreezeAllWidgets() {
  mutateState((draft) => {
    draft.notes.forEach((item) => {
      item.widget.frozen = false;
    });
  });
  return { state };
}

function exportMarkdown(noteId) {
  const note = getNoteById(noteId);
  if (!note) {
    return { cancelled: true };
  }

  return dialog
    .showSaveDialog({
      title: "导出 Markdown",
      defaultPath: `${note.title.replace(/[\\/:*?"<>|]/g, "_") || "note"}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    })
    .then((result) => {
      if (result.canceled || !result.filePath) {
        return { cancelled: true };
      }

      fs.writeFileSync(
        result.filePath,
        note.markdown || stripHtml(note.html),
        "utf8",
      );
      return { cancelled: false, filePath: result.filePath };
    });
}

ipcMain.handle("app:get-state", async () => state);
ipcMain.handle("app:show-manager", async (_event, noteId) => {
  showManagerWindow(noteId);
  return { ok: true };
});
ipcMain.handle("app:hide-manager", async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  return { ok: true };
});
ipcMain.handle("app:update-settings", async (_event, patch) => {
  mutateState((draft) => {
    draft.settings = {
      ...draft.settings,
      ...(patch || {}),
    };
  });
  applyLoginItemSettings();
  return { state };
});
ipcMain.handle("note:create", async (_event, payload) => createNote(payload));
ipcMain.handle("note:update", async (_event, noteId, patch) =>
  updateNote(noteId, patch),
);
ipcMain.handle("note:delete", async (_event, noteId) => deleteNote(noteId));
ipcMain.handle("note:duplicate", async (_event, noteId) =>
  duplicateNote(noteId),
);
ipcMain.handle("note:show-widget", async (_event, noteId) =>
  showWidget(noteId),
);
ipcMain.handle("note:hide-widget", async (_event, noteId) =>
  hideWidget(noteId),
);
ipcMain.handle("note:freeze-widget", async (_event, noteId, frozen) =>
  freezeWidget(noteId, frozen),
);
ipcMain.handle("widgets:show-all", async () => showAllWidgets());
ipcMain.handle("widgets:hide-all", async () => hideAllWidgets());
ipcMain.handle("widgets:unfreeze-all", async () => unfreezeAllWidgets());
ipcMain.handle("note:export-markdown", async (_event, noteId) =>
  exportMarkdown(noteId),
);
ipcMain.handle("widget:get-bounds", async (_event, noteId) => {
  const note = getNoteById(noteId);
  const win = widgetWindows.get(noteId);
  if (win && !win.isDestroyed()) {
    return win.getBounds();
  }
  return note
    ? {
        x: note.widget.x,
        y: note.widget.y,
        width: note.widget.width,
        height: note.widget.height,
      }
    : null;
});
ipcMain.handle("widget:set-bounds", async (_event, noteId, bounds) => {
  const note = getNoteById(noteId);
  const win = widgetWindows.get(noteId);
  if (!note) {
    return null;
  }

  const nextBounds = {
    x: Number(bounds.x),
    y: Number(bounds.y),
    width: Math.max(MIN_WIDGET_WIDTH, Number(bounds.width)),
    height: Math.max(MIN_WIDGET_HEIGHT, Number(bounds.height)),
  };

  note.widget.x = nextBounds.x;
  note.widget.y = nextBounds.y;
  note.widget.width = nextBounds.width;
  note.widget.height = nextBounds.height;
  saveState();

  if (win && !win.isDestroyed()) {
    win.setBounds(nextBounds);
  }

  return nextBounds;
});

app.on("second-instance", () => {
  showManagerWindow();
});

app.on("window-all-closed", () => {
  if (!state?.settings?.closeToTray && !isQuitting) {
    isQuitting = true;
    app.quit();
  }
});

app.on("activate", () => {
  showManagerWindow();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    state = loadState();
    createTray();
    applyLoginItemSettings();
    restoreVisibleWidgets();

    const startHidden = process.argv.includes("--hidden");
    if (!startHidden) {
      createManagerWindow({ show: true });
    }
  });
}

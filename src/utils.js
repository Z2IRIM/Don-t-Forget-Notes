export function excerptFromMarkdown(markdown = '') {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')
    .replace(/^\s{0,3}[#>*+-]\s?/gm, '')
    .replace(/^\s{0,3}\d+\.\s?/gm, '')
    .replace(/[\*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function resolveThemeMode(settingsMode, systemPrefersDark) {
  if (settingsMode === 'light' || settingsMode === 'dark') {
    return settingsMode;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

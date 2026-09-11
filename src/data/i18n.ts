export type Language = 'zh' | 'en';

export interface LocalizedText {
  zh: string;
  en: string;
}

export const languageStorageKey = 'ozone-language';
export const legacyLanguageStorageKey = 'ozone-layer-language';

export const sectionLabels: Record<'home' | 'projects' | 'daily' | 'archive' | 'about' | 'writing', LocalizedText> = {
  home: { zh: '首页', en: 'HOME' },
  projects: { zh: '项目', en: 'PROJECTS' },
  daily: { zh: '日常', en: 'DAILY' },
  archive: { zh: '档案', en: 'ARCHIVE' },
  about: { zh: '关于', en: 'ABOUT' },
  writing: { zh: '随笔', en: 'WRITING' },
};

export const ui = {
  controls: {
    site: { zh: '网站控制', en: 'Site controls' },
    language: { zh: '语言', en: 'Language' },
    theme: { zh: '主题', en: 'Theme' },
    useChinese: { zh: '使用中文界面', en: 'Use Chinese interface' },
    useEnglish: { zh: '使用英文界面', en: 'Use English interface' },
    useLight: { zh: '使用浅色主题', en: 'Use light theme' },
    useDark: { zh: '使用深色主题', en: 'Use dark theme' },
    light: { zh: '浅色', en: 'LIGHT' },
    dark: { zh: '深色', en: 'DARK' },
  },
  navigation: {
    open: { zh: '打开', en: 'Open' },
    back: { zh: '返回', en: 'Back' },
    previous: { zh: '上一组', en: 'Previous' },
    next: { zh: '下一组', en: 'Next' },
    home: { zh: '首页', en: 'Home' },
    archive: { zh: '档案', en: 'Archive' },
    projects: { zh: '项目', en: 'Projects' },
    daily: { zh: '日常', en: 'Daily' },
    writing: { zh: '随笔', en: 'Writing' },
  },
  labels: {
    recentWriting: { zh: '最近随笔', en: 'Recent Writing' },
    latest: { zh: '最新', en: 'Latest' },
    current: { zh: '当前', en: 'Current' },
    status: { zh: '状态', en: 'Status' },
    year: { zh: '年份', en: 'Year' },
    date: { zh: '日期', en: 'Date' },
    range: { zh: '时间范围', en: 'Range' },
    type: { zh: '类型', en: 'Type' },
    project: { zh: '项目', en: 'Project' },
    dailyNote: { zh: '日常记录', en: 'Daily note' },
    dateGroup: { zh: '日期组', en: 'Date group' },
    repositories: { zh: '仓库', en: 'Repositories' },
    technologies: { zh: '技术', en: 'Technologies' },
    viewSource: { zh: '查看源码', en: 'View source' },
    olderEntries: { zh: '查看更早记录', en: 'View older entries' },
  },
} as const;

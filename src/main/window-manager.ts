// src/main/window-manager.ts
// 窗口管理 - 创建、销毁、状态恢复

import { BrowserWindow } from 'electron';
import path from 'path';
import {
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
} from '../shared/constants';

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
export function createMainWindow(): BrowserWindow {
  // In dev mode, preload is compiled to a separate directory by Electron Forge.
  // In production (packaged), preload.js sits alongside main.js in .vite/build/.
  const preloadPath = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../preload/index.js')
    : path.join(__dirname, 'index.js');

  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    title: 'Note App',
    show: false, // 等 ready-to-show 后再显示，避免白屏
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Electron Forge Vite plugin injects MAIN_WINDOW_VITE_DEV_SERVER_URL as a
  // compile-time global via Vite's `define` feature — it is NOT a process.env var.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 获取主窗口实例
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

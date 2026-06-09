// src/main/index.ts
// Electron 主进程入口

import { app, BrowserWindow } from 'electron';
import { createMainWindow, getMainWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { buildMenu } from './menu';
import { initDb, runMigrations, closeDb } from '../core/database/db';

// 处理 Squirrel 安装事件（Windows 安装器，可选）
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // 未安装 electron-squirrel-startup，跳过
}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  console.log('[App] 正在初始化...');

  // 初始化数据库 (sql.js requires async init)
  await initDb();
  runMigrations();
  console.log('[App] 数据库初始化完成');

  // 注册 IPC 处理器
  registerIpcHandlers();

  // 构建菜单
  buildMenu();

  // 创建主窗口
  createMainWindow();

  console.log('[App] 初始化完成');
}

// 当 Electron 完成初始化后创建窗口
app.whenReady().then(async () => {
  await initializeApp();

  // macOS：点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  closeDb();
  console.log('[App] 应用退出，数据库已关闭');
});

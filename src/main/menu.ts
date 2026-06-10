// src/main/menu.ts
// 应用菜单定义

import { Menu, BrowserWindow, app } from 'electron';

/**
 * 构建应用菜单
 */
export function buildMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS 应用菜单
    ...(isMac
      ? [{
          label: app.getName(),
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '新建笔记',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:new-note');
          },
        },
        {
          label: '新建目录',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:new-folder');
          },
        },
        { type: 'separator' },
        {
          label: '导入',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:import');
          },
        },
        {
          label: '导出',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:export');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // 视图菜单
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // 帮助菜单
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 Note App',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

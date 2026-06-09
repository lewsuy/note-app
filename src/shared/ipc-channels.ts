// src/shared/ipc-channels.ts
// IPC 通道名称常量 - 主进程与渲染进程通信使用

export const IPC_CHANNELS = {
  // 笔记操作
  NOTE_CREATE:        'note:create',
  NOTE_GET:           'note:get',
  NOTE_GET_ALL:       'note:getAll',
  NOTE_GET_BY_FOLDER: 'note:getByFolder',
  NOTE_UPDATE:        'note:update',
  NOTE_DELETE:        'note:delete',
  NOTE_MOVE:          'note:move',
  NOTE_SEARCH:        'note:search',

  // 目录操作
  FOLDER_CREATE:      'folder:create',
  FOLDER_GET_TREE:    'folder:getTree',
  FOLDER_UPDATE:      'folder:update',
  FOLDER_DELETE:      'folder:delete',
  FOLDER_MOVE:        'folder:move',
  FOLDER_REORDER:     'folder:reorder',

  // 标签操作
  TAG_CREATE:         'tag:create',
  TAG_GET_ALL:        'tag:getAll',
  TAG_UPDATE:         'tag:update',
  TAG_DELETE:         'tag:delete',
  TAG_GET_NOTES:      'tag:getNotes',
  NOTE_ADD_TAG:       'note:addTag',
  NOTE_REMOVE_TAG:    'note:removeTag',
  NOTE_GET_TAGS:      'note:getTags',

  // 导入导出
  IMPORT_FILES:       'import:files',
  IMPORT_FOLDER:      'import:folder',
  EXPORT_NOTE:        'export:note',
  EXPORT_FOLDER:      'export:folder',

  // 应用操作
  APP_GET_SETTINGS:   'app:getSettings',
  APP_SET_SETTING:    'app:setSetting',
  APP_OPEN_FILE:      'app:openFile',
  APP_SAVE_FILE:      'app:saveFile',
} as const;

/** IPC 通道类型 */
export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

# 本地 Markdown 笔记软件 — 架构设计文档

> 版本：v1.0  
> 日期：2026-06-09  
> 类型：桌面应用，完全离线，本地存储  

---

## 1. 技术栈选型

### 1.1 总体方案

| 层次 | 技术选择 | 说明 |
|------|----------|------|
| **桌面框架** | Electron + Electron Forge | 成熟的跨平台桌面应用框架，自带 Chromium 渲染引擎，保证 Markdown 预览的渲染一致性 |
| **前端框架** | Vue 3 + TypeScript | 响应式数据绑定，组件化开发效率高；TypeScript 提供类型安全，降低长期维护成本 |
| **UI 组件库** | Element Plus | 成熟的 Vue 3 组件库，内置 Tree、Tag、Splitter 等组件，大幅减少 UI 开发量 |
| **状态管理** | Pinia | Vue 3 官方推荐，轻量级，支持 TypeScript，适合中等规模应用 |
| **Markdown 编辑器** | CodeMirror 6 | 模块化设计，性能优秀，支持自定义语法高亮和扩展，是目前最主流的代码/Markdown 编辑器方案 |
| **Markdown 渲染** | markdown-it + markdown-it 插件链 | 可扩展的 Markdown 解析器，支持表格、任务列表、代码高亮等常用扩展 |
| **代码高亮** | highlight.js | 配合 markdown-it 使用，支持 190+ 种语言 |
| **文件存储** | Node.js fs 模块 + better-sqlite3 | 文件系统存储 Markdown 文件，SQLite 存储元数据（标签、目录映射、搜索索引） |
| **构建工具** | Vite | 极快的 HMR 开发体验，开箱即用的 TypeScript 支持 |
| **包管理** | pnpm | 磁盘效率高，严格依赖管理 |

### 1.2 选型理由

**为什么选 Electron 而不是 Tauri？**
- Tauri (Rust) 虽然更轻量，但本项目为内部工具类应用，包体积不是首要约束
- Electron 生态更成熟，遇到问题更容易找到解决方案
- 团队如果熟悉 Web 技术栈，Electron 学习成本更低
- Tauri 的 WebView 在不同 Windows 版本上可能有渲染差异

**为什么选 Vue 3 而不是 React？**
- Vue 3 的模板语法对于表单密集型的桌面应用更直观
- Element Plus 组件库与 Vue 配合最紧密
- 响应式系统更适合处理文件监听、实时预览等场景

**为什么文件 + SQLite 混合存储？**
- Markdown 文件以纯文本存储，方便用户直接用其他编辑器打开/编辑，也方便导入导出
- SQLite 存储元数据（标签、目录结构、搜索索引），查询性能远优于遍历文件系统
- 两者结合兼顾了可移植性和查询性能

---

## 2. 项目结构

```
note-app/
├── forge.config.ts                  # Electron Forge 打包配置
├── package.json
├── tsconfig.json
├── vite.main.config.ts              # Vite 主进程配置
├── vite.preload.config.ts           # Vite preload 脚本配置
├── vite.renderer.config.ts          # Vite 渲染进程配置
│
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                 # 主进程入口
│   │   ├── ipc-handlers.ts          # IPC 通信处理注册
│   │   ├── menu.ts                  # 应用菜单定义
│   │   ├── window-manager.ts        # 窗口管理（创建、销毁、状态恢复）
│   │   └── dialog.ts                # 系统对话框（文件选择、导出等）
│   │
│   ├── preload/                     # 预加载脚本（安全桥接）
│   │   └── index.ts                 # contextBridge 暴露安全 API
│   │
│   ├── renderer/                    # 渲染进程（Vue 应用）
│   │   ├── index.html               # 入口 HTML
│   │   ├── main.ts                  # Vue 应用入口
│   │   ├── App.vue                  # 根组件
│   │   │
│   │   ├── components/              # UI 组件
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.vue        # 整体布局容器
│   │   │   │   ├── Sidebar.vue          # 左侧面板（目录树 + 标签）
│   │   │   │   └── MainPanel.vue        # 右侧主面板
│   │   │   │
│   │   │   ├── tree/
│   │   │   │   ├── FolderTree.vue       # 目录树组件
│   │   │   │   ├── FolderTreeNode.vue   # 目录树节点
│   │   │   │   ├── NoteListItem.vue     # 笔记列表项
│   │   │   │   └── TreeContextMenu.vue  # 右键菜单（新建/重命名/删除）
│   │   │   │
│   │   │   ├── editor/
│   │   │   │   ├── MarkdownEditor.vue   # CodeMirror 6 编辑器
│   │   │   │   ├── EditorToolbar.vue    # 编辑器工具栏
│   │   │   │   └── MarkdownPreview.vue  # Markdown 预览面板
│   │   │   │
│   │   │   ├── tags/
│   │   │   │   ├── TagPanel.vue         # 标签管理面板
│   │   │   │   ├── TagInput.vue         # 标签输入组件
│   │   │   │   └── TagFilter.vue        # 标签筛选器
│   │   │   │
│   │   │   └── common/
│   │   │       ├── SearchBar.vue        # 全局搜索
│   │   │       ├── StatusBar.vue        # 底部状态栏
│   │   │       └── ConfirmDialog.vue    # 确认对话框
│   │   │
│   │   ├── stores/                  # Pinia 状态管理
│   │   │   ├── note-store.ts            # 笔记状态（当前笔记、笔记列表）
│   │   │   ├── folder-store.ts          # 目录状态（目录树、当前目录）
│   │   │   ├── tag-store.ts             # 标签状态（标签列表、筛选条件）
│   │   │   └── ui-store.ts              # UI 状态（面板宽度、编辑/预览模式）
│   │   │
│   │   ├── composables/             # 组合式函数
│   │   │   ├── use-markdown.ts          # Markdown 解析与渲染逻辑
│   │   │   ├── use-auto-save.ts         # 自动保存逻辑
│   │   │   ├── use-import-export.ts     # 导入导出逻辑
│   │   │   └── use-keyboard.ts          # 快捷键绑定
│   │   │
│   │   ├── styles/                  # 全局样式
│   │   │   ├── variables.scss           # 主题变量（颜色、间距）
│   │   │   ├── global.scss              # 全局基础样式
│   │   │   └── markdown-theme.scss      # Markdown 预览主题样式
│   │   │
│   │   └── assets/                  # 静态资源
│   │       └── icons/                   # 图标资源
│   │
│   ├── core/                        # 核心业务逻辑（主进程/渲染进程共用）
│   │   ├── services/
│   │   │   ├── note-service.ts          # 笔记 CRUD 服务
│   │   │   ├── folder-service.ts        # 目录 CRUD 服务
│   │   │   ├── tag-service.ts           # 标签 CRUD 服务
│   │   │   ├── search-service.ts        # 全文搜索服务
│   │   │   └── import-export-service.ts # 导入导出服务
│   │   │
│   │   ├── models/                  # 数据模型定义
│   │   │   ├── note.ts                  # 笔记模型
│   │   │   ├── folder.ts                # 目录模型
│   │   │   └── tag.ts                   # 标签模型
│   │   │
│   │   └── database/                # 数据库层
│   │       ├── db.ts                    # SQLite 连接管理
│   │       ├── migrations/              # 数据库迁移脚本
│   │       │   └── 001-init.ts
│   │       └── repositories/            # 数据访问层
│   │           ├── note-repository.ts
│   │           ├── folder-repository.ts
│   │           └── tag-repository.ts
│   │
│   └── shared/                      # 主进程与渲染进程共享
│       ├── types.ts                     # 共享类型定义
│       ├── constants.ts                 # 常量定义
│       └── ipc-channels.ts             # IPC 通道名称常量
│
├── data/                            # 运行时数据目录（用户数据）
│   ├── notes/                       # Markdown 文件存储根目录
│   │   └── {noteId}.md
│   ├── attachments/                 # 附件目录（图片等）
│   │   └── {noteId}/
│   │       └── {filename}
│   └── metadata.db                  # SQLite 元数据库
│
├── tests/                           # 测试
│   ├── unit/
│   │   ├── services/
│   │   └── stores/
│   ├── integration/
│   └── e2e/
│
└── docs/                            # 文档
    └── architecture.md              # 本文档
```

### 2.1 数据目录说明

用户数据默认存储在系统用户数据目录下：
- **Windows**: `%APPDATA%/note-app/`
- **macOS**: `~/Library/Application Support/note-app/`
- **Linux**: `~/.config/note-app/`

`data/` 目录结构在首次启动时自动创建。

---

## 3. 数据模型设计

### 3.1 笔记文件格式（.md）

每篇笔记存储为独立的 `.md` 文件，文件头部使用 YAML Front Matter 存储元数据：

```markdown
---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
title: "我的第一篇笔记"
folder_id: "f1e2d3c4-b5a6-7890-cdef-1234567890ab"
tags: ["工作", "会议记录", "项目A"]
created_at: "2026-06-09T10:30:00.000Z"
updated_at: "2026-06-09T14:20:00.000Z"
---

# 笔记正文内容

这里是 Markdown 正文...
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID v4) | 笔记唯一标识，全局唯一 |
| `title` | string | 笔记标题，默认取正文第一个 `#` 标题或文件名 |
| `folder_id` | string (UUID) | 所属目录 ID |
| `tags` | string[] | 标签列表 |
| `created_at` | ISO 8601 | 创建时间 |
| `updated_at` | ISO 8601 | 最后修改时间 |

**文件命名规则：** `{id}.md`，使用 UUID 避免文件名冲突，支持笔记重命名不影响文件路径。

### 3.2 SQLite 元数据库结构

数据库文件：`metadata.db`

#### 3.2.1 folders 表（目录）

```sql
CREATE TABLE folders (
    id           TEXT PRIMARY KEY,        -- UUID
    name         TEXT NOT NULL,           -- 目录名称
    parent_id    TEXT,                    -- 父目录 ID，NULL 表示根目录
    sort_order   INTEGER DEFAULT 0,       -- 同级排序序号
    icon         TEXT DEFAULT 'folder',   -- 目录图标标识
    created_at   TEXT NOT NULL,           -- 创建时间 ISO 8601
    updated_at   TEXT NOT NULL,           -- 修改时间 ISO 8601
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_sort ON folders(parent_id, sort_order);
```

#### 3.2.2 notes 表（笔记元数据）

```sql
CREATE TABLE notes (
    id           TEXT PRIMARY KEY,        -- UUID
    title        TEXT NOT NULL,           -- 笔记标题
    folder_id    TEXT NOT NULL,           -- 所属目录 ID
    file_path    TEXT NOT NULL,           -- 文件相对路径（相对于 data/notes/）
    is_pinned    INTEGER DEFAULT 0,       -- 是否置顶
    word_count   INTEGER DEFAULT 0,       -- 字数统计
    created_at   TEXT NOT NULL,           -- 创建时间
    updated_at   TEXT NOT NULL,           -- 最后修改时间
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX idx_notes_pinned ON notes(is_pinned DESC, updated_at DESC);
```

#### 3.2.3 tags 表（标签）

```sql
CREATE TABLE tags (
    id           TEXT PRIMARY KEY,        -- UUID
    name         TEXT NOT NULL UNIQUE,    -- 标签名称（唯一）
    color        TEXT DEFAULT '#409EFF',  -- 标签颜色
    created_at   TEXT NOT NULL            -- 创建时间
);
```

#### 3.2.4 note_tags 表（笔记-标签关联）

```sql
CREATE TABLE note_tags (
    note_id      TEXT NOT NULL,
    tag_id       TEXT NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
```

#### 3.2.5 app_settings 表（应用配置）

```sql
CREATE TABLE app_settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL
);
```

默认配置项：
- `data_dir`：数据存储根目录
- `editor_font_size`：编辑器字体大小
- `editor_theme`：编辑器主题（light/dark）
- `auto_save_interval`：自动保存间隔（毫秒，默认 3000）
- `last_opened_note`：上次打开的笔记 ID
- `last_opened_folder`：上次打开的目录 ID
- `sidebar_width`：侧边栏宽度
- `editor_preview_mode`：编辑/预览模式（edit/preview/split）

### 3.3 目录结构模型

目录树支持无限层级嵌套，通过 `parent_id` 实现父子关系：

```
根目录 (parent_id = NULL)
├── 工作/
│   ├── 会议记录/
│   └── 项目文档/
├── 学习/
│   ├── 编程/
│   │   ├── Python/
│   │   └── JavaScript/
│   └── 读书笔记/
└── 个人/
    └── 日记/
```

**数据库查询递归目录树：** 使用 CTE（Common Table Expression）递归查询：

```sql
WITH RECURSIVE folder_tree AS (
    SELECT id, name, parent_id, sort_order, 0 AS depth
    FROM folders WHERE parent_id IS NULL
    UNION ALL
    SELECT f.id, f.name, f.parent_id, f.sort_order, ft.depth + 1
    FROM folders f
    JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree ORDER BY sort_order;
```

---

## 4. 核心模块划分

### 4.1 模块总览

```
┌─────────────────────────────────────────────────────┐
│                   渲染进程 (Vue 3)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ 目录树模块 │ │ 编辑器模块 │ │ 标签模块   │ │ 搜索模块│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │
│       │            │            │            │       │
│  ┌────▼────────────▼────────────▼────────────▼────┐  │
│  │              Pinia 状态管理层                    │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │ IPC                           │
├───────────────────────┼──────────────────────────────┤
│                  主进程 (Node.js)                      │
│  ┌────────────────────▼───────────────────────────┐  │
│  │              IPC 路由层 (Handlers)               │  │
│  └────┬────────────┬────────────┬────────────┬────┘  │
│  ┌────▼─────┐ ┌────▼─────┐ ┌───▼──────┐ ┌──▼─────┐  │
│  │ 笔记服务  │ │ 目录服务  │ │ 标签服务  │ │搜索服务│  │
│  └────┬─────┘ └────┬─────┘ └───┬──────┘ └──┬─────┘  │
│       │            │            │            │       │
│  ┌────▼────────────▼────────────▼────────────▼────┐  │
│  │          数据持久层 (SQLite + fs)                │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 4.2 各模块职责

#### 4.2.1 目录树模块 (FolderTree)

**职责：**
- 展示可折叠的树形目录结构
- 支持目录的增删改查
- 支持拖拽排序和移动目录
- 右键菜单操作（新建子目录、重命名、删除）
- 点击目录筛选该目录下的笔记列表
- 显示每个目录下的笔记数量

**关键交互：**
- 点击目录节点 → 更新笔记列表
- 右键 → 弹出上下文菜单
- 拖拽 → 更新 `parent_id` 和 `sort_order`
- 双击 → 进入重命名模式

#### 4.2.2 编辑器模块 (MarkdownEditor)

**职责：**
- 提供 Markdown 语法高亮的编辑区域（CodeMirror 6）
- 实时解析 Markdown 并渲染预览
- 编辑/预览同步滚动
- 工具栏快捷操作（加粗、斜体、标题、列表、代码块等）
- 自动保存（防抖，停止编辑 3 秒后自动保存）
- 快捷键支持

**编辑器功能清单：**

| 功能 | 说明 |
|------|------|
| 语法高亮 | Markdown 语法着色 |
| 行号显示 | 左侧行号 |
| 自动补全 | `[]` 自动闭合，列表自动续行 |
| 快捷插入 | 工具栏按钮快速插入 Markdown 语法 |
| 分栏模式 | 左编辑右预览，可切换为纯编辑/纯预览 |
| 同步滚动 | 编辑区和预览区滚动位置同步 |
| 图片粘贴 | 支持粘贴剪贴板图片，保存到附件目录 |
| 自动保存 | 可配置间隔，默认 3 秒 |

#### 4.2.3 预览模块 (MarkdownPreview)

**职责：**
- 将 Markdown 源码渲染为 HTML
- 支持 GFM（GitHub Flavored Markdown）语法
- 代码块语法高亮
- 表格渲染
- 任务列表渲染
- 数学公式渲染（可选，使用 KaTeX）
- 自定义 CSS 主题

#### 4.2.4 标签模块 (TagPanel)

**职责：**
- 管理全局标签列表（新增、编辑颜色、删除）
- 为当前笔记添加/移除标签
- 按标签筛选笔记（支持多标签组合筛选）
- 标签输入自动补全
- 显示每个标签关联的笔记数量

#### 4.2.5 搜索模块 (SearchBar)

**职责：**
- 全文搜索笔记内容（基于 SQLite FTS5 全文索引）
- 搜索结果高亮显示
- 按标题搜索
- 搜索范围可限定（当前目录/全部）
- 搜索历史记录

**搜索方案：** 使用 SQLite FTS5 扩展建立全文索引：

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title,
    content,
    content=notes,
    content_rowid=rowid
);
```

#### 4.2.6 导入导出模块 (ImportExport)

**职责：**
- **导入**：选择 `.md` 文件或包含 `.md` 的文件夹，批量导入
  - 解析 Front Matter 提取元数据
  - 无 Front Matter 的文件，以文件名为标题，创建新笔记
  - 支持保留原目录结构
- **导出**：
  - 单篇笔记导出为 `.md` 文件（含完整 Front Matter）
  - 目录批量导出为文件夹结构
  - 导出时可选择是否包含 Front Matter

#### 4.2.7 数据持久层

**职责：**
- 管理 SQLite 数据库连接和迁移
- 提供笔记、目录、标签的 CRUD 数据访问接口
- 管理 Markdown 文件的文件系统读写
- 附件文件管理（图片存储与引用）
- 数据库初始化与版本迁移

---

## 5. UI 布局设计

### 5.1 整体布局

```
┌──────────────────────────────────────────────────────────────┐
│  菜单栏 (Menu Bar)                          最小化 最大化 关闭 │
├──────────────────────────────────────────────────────────────┤
│  工具栏：[新建笔记] [新建目录] [导入] [导出] [搜索框__________] │
├────────────┬─────────────────────────────────────────────────┤
│            │  面包屑导航: 工作 > 会议记录 > 2026年6月         │
│  侧边栏    ├─────────────────────────────────────────────────┤
│            │                                                 │
│  ┌─目录树──┐│  ┌──────────────────┬─────────────────────────┐│
│  │ 📁 全部  ││  │                  │                         ││
│  │ 📂 工作  ││  │   编辑区         │    预览区               ││
│  │  📂 会议 ││  │                  │                         ││
│  │  📂 项目 ││  │   [Markdown      │    渲染后的             ││
│  │ 📂 学习  ││  │    语法高亮       │    Markdown             ││
│  │  📂 编程 ││  │    编辑区域]      │    预览区域             ││
│  │  📂 读书 ││  │                  │                         ││
│  │ 📂 个人  ││  │                  │                         ││
│  └─────────┘│  └──────────────────┴─────────────────────────┘│
│            │                                                 │
│  ┌─标签────┐│  ┌─────────────────────────────────────────────┐│
│  │ #工作    ││  │ 标签: [工作] [会议记录] [+]                  ││
│  │ #学习    ││  │ 字数: 1,234  |  最后修改: 2026-06-09 14:20  ││
│  │ #重要    ││  └─────────────────────────────────────────────┘│
│  └─────────┘│                                                 │
├────────────┴─────────────────────────────────────────────────┤
│  状态栏：笔记数: 128  |  当前目录: 工作/会议记录  |  自动保存 ✓ │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 区域详细说明

#### 5.2.1 菜单栏（顶部）

- **文件**：新建笔记、新建目录、导入、导出、退出
- **编辑**：撤销、重做、查找替换
- **视图**：编辑模式、预览模式、分栏模式、切换暗色主题
- **帮助**：关于、快捷键说明

#### 5.2.2 工具栏（菜单栏下方）

- 左侧：新建笔记按钮、新建目录按钮
- 中间：导入、导出按钮
- 右侧：全局搜索输入框（Ctrl+K 快捷聚焦）

#### 5.2.3 侧边栏（左侧，可拖拽调整宽度，默认 260px）

分为两个区域：

**上半部分 — 目录树区域（约 60%）：**
- 使用 Element Plus 的 `el-tree` 组件
- 支持展开/折叠
- 显示目录名称和笔记数量
- 当前选中目录高亮
- 支持右键菜单
- 支持拖拽排序

**下半部分 — 标签区域（约 40%）：**
- 标签列表，每个标签显示关联笔记数
- 点击标签筛选笔记
- 支持多选标签组合筛选
- 新建标签按钮

#### 5.2.4 主内容区（右侧）

**顶部 — 面包屑 + 笔记标题：**
- 面包屑导航：显示当前目录路径，可点击跳转
- 笔记标题（可点击编辑）

**中部 — 编辑/预览区（核心区域）：**
- **分栏模式（默认）**：左半编辑，右半预览，中间分隔条可拖拽
- **纯编辑模式**：全屏编辑
- **纯预览模式**：全屏预览

**底部 — 标签栏 + 状态信息：**
- 当前笔记的标签列表（可添加/删除）
- 字数统计
- 最后修改时间

### 5.3 主题方案

- 默认浅色主题，支持切换暗色主题
- 颜色变量统一定义在 `variables.scss` 中
- Markdown 预览区域使用独立的 CSS 主题，参考 GitHub Markdown 样式

### 5.4 响应式断点

| 断点 | 宽度 | 行为 |
|------|------|------|
| 宽屏 | ≥ 1200px | 正常三栏布局 |
| 中等 | 800-1199px | 侧边栏可折叠 |
| 小窗 | < 800px | 侧边栏隐藏，通过按钮唤起 |

---

## 6. 关键接口定义

### 6.1 IPC 通信接口

主进程与渲染进程通过 Electron IPC 通信。以下定义所有 IPC 通道：

#### 6.1.1 通道定义 (`src/shared/ipc-channels.ts`)

```typescript
export const IPC_CHANNELS = {
  // 笔记操作
  NOTE_CREATE:       'note:create',
  NOTE_GET:          'note:get',
  NOTE_GET_ALL:      'note:getAll',
  NOTE_GET_BY_FOLDER:'note:getByFolder',
  NOTE_UPDATE:       'note:update',
  NOTE_DELETE:       'note:delete',
  NOTE_MOVE:         'note:move',
  NOTE_SEARCH:       'note:search',

  // 目录操作
  FOLDER_CREATE:     'folder:create',
  FOLDER_GET_TREE:   'folder:getTree',
  FOLDER_UPDATE:     'folder:update',
  FOLDER_DELETE:     'folder:delete',
  FOLDER_MOVE:       'folder:move',
  FOLDER_REORDER:    'folder:reorder',

  // 标签操作
  TAG_CREATE:        'tag:create',
  TAG_GET_ALL:       'tag:getAll',
  TAG_UPDATE:        'tag:update',
  TAG_DELETE:        'tag:delete',
  TAG_GET_NOTES:     'tag:getNotes',
  NOTE_ADD_TAG:      'note:addTag',
  NOTE_REMOVE_TAG:   'note:removeTag',
  NOTE_GET_TAGS:     'note:getTags',

  // 导入导出
  IMPORT_FILES:      'import:files',
  IMPORT_FOLDER:     'import:folder',
  EXPORT_NOTE:       'export:note',
  EXPORT_FOLDER:     'export:folder',

  // 应用操作
  APP_GET_SETTINGS:  'app:getSettings',
  APP_SET_SETTING:   'app:setSetting',
  APP_OPEN_FILE:     'app:openFile',
  APP_SAVE_FILE:     'app:saveFile',
} as const;
```

#### 6.1.2 笔记服务接口

```typescript
// src/core/services/note-service.ts

interface INoteService {
  // 创建笔记
  create(params: {
    title: string;
    folderId: string;
    content?: string;
    tags?: string[];
  }): Promise<Note>;

  // 获取笔记详情（含正文内容）
  getById(id: string): Promise<NoteDetail>;

  // 获取笔记列表（不含正文，仅元数据）
  getAll(options?: {
    sortBy?: 'updated_at' | 'created_at' | 'title';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<NoteSummary[]>;

  // 按目录获取笔记列表
  getByFolder(folderId: string, recursive?: boolean): Promise<NoteSummary[]>;

  // 更新笔记
  update(id: string, params: {
    title?: string;
    content?: string;
    folderId?: string;
    isPinned?: boolean;
  }): Promise<Note>;

  // 删除笔记（同时删除文件和数据库记录）
  delete(id: string): Promise<void>;

  // 移动笔记到另一个目录
  move(ids: string[], targetFolderId: string): Promise<void>;

  // 全文搜索
  search(keyword: string, options?: {
    folderId?: string;
    tagIds?: string[];
    limit?: number;
  }): Promise<SearchResult[]>;
}
```

#### 6.1.3 目录服务接口

```typescript
// src/core/services/folder-service.ts

interface IFolderService {
  // 创建目录
  create(params: {
    name: string;
    parentId?: string | null;
  }): Promise<Folder>;

  // 获取完整目录树
  getTree(): Promise<FolderTreeNode[]>;

  // 更新目录
  update(id: string, params: {
    name?: string;
    icon?: string;
  }): Promise<Folder>;

  // 删除目录（级联删除子目录和笔记）
  delete(id: string): Promise<void>;

  // 移动目录
  move(id: string, targetParentId: string | null): Promise<void>;

  // 重排序
  reorder(ids: string[]): Promise<void>;
}

interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string;
  children: FolderTreeNode[];
  noteCount: number;  // 直接子笔记数量
}
```

#### 6.1.4 标签服务接口

```typescript
// src/core/services/tag-service.ts

interface ITagService {
  // 创建标签
  create(params: { name: string; color?: string }): Promise<Tag>;

  // 获取所有标签（含笔记数量）
  getAll(): Promise<TagWithCount[]>;

  // 更新标签
  update(id: string, params: { name?: string; color?: string }): Promise<Tag>;

  // 删除标签
  delete(id: string): Promise<void>;

  // 获取某标签下的所有笔记
  getNotesByTag(tagId: string): Promise<NoteSummary[]>;

  // 获取某笔记的所有标签
  getTagsByNote(noteId: string): Promise<Tag[]>;

  // 为笔记添加标签
  addTagToNote(noteId: string, tagId: string): Promise<void>;

  // 从笔记移除标签
  removeTagFromNote(noteId: string, tagId: string): Promise<void>;
}

interface TagWithCount extends Tag {
  noteCount: number;
}
```

#### 6.1.5 导入导出服务接口

```typescript
// src/core/services/import-export-service.ts

interface IImportExportService {
  // 导入单个 .md 文件
  importFile(filePath: string, targetFolderId: string): Promise<Note>;

  // 导入文件夹（递归导入所有 .md 文件）
  importFolder(folderPath: string, targetFolderId: string): Promise<{
    imported: number;
    errors: { file: string; error: string }[];
  }>;

  // 导出笔记为 .md 文件
  exportNote(noteId: string, targetPath: string, options?: {
    includeFrontMatter?: boolean;  // 默认 true
  }): Promise<string>;  // 返回导出文件路径

  // 导出目录下所有笔记
  exportFolder(folderId: string, targetPath: string, options?: {
    includeFrontMatter?: boolean;
  }): Promise<{
    exported: number;
    path: string;
  }>;
}
```

### 6.2 共享类型定义

```typescript
// src/shared/types.ts

interface Note {
  id: string;
  title: string;
  folderId: string;
  filePath: string;
  isPinned: boolean;
  wordCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteDetail extends Note {
  content: string;  // Markdown 正文（不含 Front Matter）
}

interface NoteSummary extends Omit<Note, 'content'> {
  // 笔记列表项，不含正文内容
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface SearchResult {
  noteId: string;
  title: string;
  snippet: string;       // 匹配片段（含高亮标记）
  matchCount: number;    // 匹配次数
  folderPath: string;    // 所属目录路径
}

interface AppSettings {
  dataDir: string;
  editorFontSize: number;
  editorTheme: 'light' | 'dark';
  autoSaveInterval: number;
  lastOpenedNote: string | null;
  lastOpenedFolder: string | null;
  sidebarWidth: number;
  editorPreviewMode: 'edit' | 'preview' | 'split';
}
```

### 6.3 Preload API 暴露

```typescript
// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // 笔记
  note: {
    create:        (params) => ipcRenderer.invoke('note:create', params),
    get:           (id)      => ipcRenderer.invoke('note:get', id),
    getAll:        (options)  => ipcRenderer.invoke('note:getAll', options),
    getByFolder:   (folderId) => ipcRenderer.invoke('note:getByFolder', folderId),
    update:        (id, params) => ipcRenderer.invoke('note:update', id, params),
    delete:        (id)      => ipcRenderer.invoke('note:delete', id),
    move:          (ids, targetFolderId) => ipcRenderer.invoke('note:move', ids, targetFolderId),
    search:        (keyword, options)    => ipcRenderer.invoke('note:search', keyword, options),
  },
  // 目录
  folder: {
    create:  (params)  => ipcRenderer.invoke('folder:create', params),
    getTree: ()        => ipcRenderer.invoke('folder:getTree'),
    update:  (id, params) => ipcRenderer.invoke('folder:update', id, params),
    delete:  (id)      => ipcRenderer.invoke('folder:delete', id),
    move:    (id, parentId) => ipcRenderer.invoke('folder:move', id, parentId),
    reorder: (ids)     => ipcRenderer.invoke('folder:reorder', ids),
  },
  // 标签
  tag: {
    create:          (params)  => ipcRenderer.invoke('tag:create', params),
    getAll:          ()        => ipcRenderer.invoke('tag:getAll'),
    update:          (id, params) => ipcRenderer.invoke('tag:update', id, params),
    delete:          (id)      => ipcRenderer.invoke('tag:delete', id),
    getNotesByTag:   (tagId)   => ipcRenderer.invoke('tag:getNotes', tagId),
  },
  // 笔记标签关联
  noteTag: {
    getTags:        (noteId) => ipcRenderer.invoke('note:getTags', noteId),
    addTag:         (noteId, tagId) => ipcRenderer.invoke('note:addTag', noteId, tagId),
    removeTag:      (noteId, tagId) => ipcRenderer.invoke('note:removeTag', noteId, tagId),
  },
  // 导入导出
  io: {
    importFile:   (path, folderId) => ipcRenderer.invoke('import:files', path, folderId),
    importFolder: (path, folderId) => ipcRenderer.invoke('import:folder', path, folderId),
    exportNote:   (noteId, path, options) => ipcRenderer.invoke('export:note', noteId, path, options),
    exportFolder: (folderId, path, options) => ipcRenderer.invoke('export:folder', folderId, path, options),
  },
  // 应用设置
  settings: {
    get: (key)    => ipcRenderer.invoke('app:getSettings', key),
    set: (key, value) => ipcRenderer.invoke('app:setSetting', key, value),
  },
  // 系统对话框（通过主进程调用）
  dialog: {
    openFile:   (options) => ipcRenderer.invoke('app:openFile', options),
    saveFile:   (options) => ipcRenderer.invoke('app:saveFile', options),
  },
};

contextBridge.exposeInMainWorld('api', api);
```

---

## 7. 开发计划

### Phase 1：基础骨架（第 1-2 周）

**目标：** 搭建项目框架，实现最小可运行原型

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 项目初始化 | P0 | Electron + Vue 3 + TypeScript + Vite 项目脚手架 |
| 数据库初始化 | P0 | SQLite 建表、迁移脚本、连接管理 |
| 主进程 IPC 框架 | P0 | IPC 通道注册、错误处理、Preload 桥接 |
| 基础布局 | P0 | AppLayout、Sidebar、MainPanel 三栏布局 |
| 目录树 CRUD | P0 | 目录的增删改查，树形展示 |
| 笔记 CRUD | P0 | 笔记的创建、打开、编辑、保存、删除 |
| 基础编辑器 | P0 | CodeMirror 6 集成，Markdown 语法高亮 |

**交付物：** 可运行的桌面应用，支持创建目录、新建笔记、编辑保存。

### Phase 2：核心功能（第 3-4 周）

**目标：** 完成所有核心功能

| 任务 | 优先级 | 说明 |
|------|--------|------|
| Markdown 预览 | P0 | markdown-it 渲染预览面板 |
| 分栏模式 | P0 | 编辑/预览分栏，同步滚动 |
| 标签系统 | P0 | 标签 CRUD、笔记关联、标签筛选 |
| 目录拖拽 | P1 | 目录树拖拽排序、移动 |
| 笔记移动 | P1 | 笔记在目录间移动 |
| 自动保存 | P0 | 停止编辑后自动保存，防抖处理 |
| 笔记置顶 | P2 | 笔记置顶功能 |

**交付物：** 具备完整目录管理、Markdown 编辑预览、标签管理的可用应用。

### Phase 3：增强体验（第 5-6 周）

**目标：** 完善用户体验

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 导入功能 | P1 | 单文件/文件夹导入 .md |
| 导出功能 | P1 | 笔记/目录导出为 .md |
| 全文搜索 | P1 | SQLite FTS5 全文搜索 |
| 编辑器工具栏 | P1 | Markdown 快捷插入工具栏 |
| 右键菜单 | P1 | 目录树/笔记列表右键菜单 |
| 快捷键 | P2 | 常用操作快捷键绑定 |
| 暗色主题 | P2 | 暗色主题切换 |
| 图片粘贴 | P2 | 剪贴板图片粘贴到笔记 |

**交付物：** 功能完整、体验良好的 v1.0 版本。

### Phase 4：打磨优化（第 7-8 周）

**目标：** 性能优化、测试覆盖、打包发布

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 性能优化 | P1 | 大目录树虚拟滚动、大量笔记列表优化 |
| 单元测试 | P1 | 核心服务层单元测试 |
| 集成测试 | P2 | IPC 通信、数据库操作集成测试 |
| E2E 测试 | P2 | Playwright 端到端测试 |
| 应用打包 | P0 | Electron Forge 打包 Windows/macOS/Linux |
| 数据目录迁移 | P2 | 支持更改数据存储目录 |
| 应用图标 | P2 | 应用图标和启动画面 |
| 用户文档 | P3 | 使用说明文档 |

**交付物：** 可分发的 v1.0 正式版本。

### 关键里程碑

```
Week 2  ──►  可运行原型（目录 + 笔记 + 编辑）
Week 4  ──►  功能完整内测版（预览 + 标签 + 搜索）
Week 6  ──►  体验完善版（导入导出 + 主题 + 快捷键）
Week 8  ──►  v1.0 正式发布版（测试 + 打包 + 文档）
```

---

## 附录

### A. 技术风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| CodeMirror 6 学习曲线 | 编辑器开发进度 | 提前准备 CM6 示例，核心只用基础功能 |
| 大量笔记的目录树性能 | UI 卡顿 | 超过 500 个节点时启用虚拟滚动 |
| SQLite 并发写入 | 数据一致性 | 使用 WAL 模式 + 写入队列 |
| Electron 包体积大 | 分发体积 | 使用 asar 打包 + 按需引入 |
| 跨平台文件路径差异 | 文件读写错误 | 统一使用 path.join，避免硬编码路径 |

### B. 快捷键规划

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建笔记 |
| `Ctrl+S` | 手动保存 |
| `Ctrl+K` | 聚焦搜索框 |
| `Ctrl+Shift+N` | 新建目录 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` | 重做 |
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+E` | 切换编辑/预览模式 |
| `Ctrl+\` | 切换侧边栏 |
| `Ctrl+Shift+E` | 切换分栏模式 |
| `Delete` | 删除选中笔记/目录（需确认） |
| `F2` | 重命名目录 |

### C. Markdown 预览支持的扩展语法

- GFM（GitHub Flavored Markdown）
- 任务列表 `- [x] done`
- 表格
- 围栏代码块 ` ``` `
- 代码语法高亮
- 自动链接
- 删除线 `~~text~~`
- 数学公式 `$...$`（可选，KaTeX）
- 目录自动生成 `[TOC]`
- 脚注 `[^1]`

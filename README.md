# Note App

A fully offline, local-first Markdown note-taking desktop application inspired by WizNote. Built with modern web technologies, it provides a rich editing experience with folder organization, tagging, full-text search, and a split-pane editor/preview layout.

All data is stored locally on your machine — no cloud sync, no accounts, no tracking.

## Screenshots

<!-- TODO: Add screenshots -->

> Screenshots coming soon. The app features a three-panel layout with a folder tree + tag sidebar on the left, and a split Markdown editor/preview pane on the right.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Framework** | Electron + Electron Forge |
| **Frontend Framework** | Vue 3 + TypeScript |
| **UI Components** | Element Plus |
| **State Management** | Pinia |
| **Markdown Editor** | CodeMirror 6 |
| **Markdown Rendering** | markdown-it + highlight.js |
| **Database** | SQLite (via sql.js) |
| **Build Tool** | Vite |

## Features

- **Rich Markdown Editor** — CodeMirror 6-powered editor with syntax highlighting, line numbers, and auto-closing brackets
- **Live Preview** — Real-time Markdown rendering with split-pane, edit-only, and preview-only modes
- **Folder Organization** — Unlimited nested folder hierarchy with drag-and-drop support
- **Tag System** — Create colored tags, assign to notes, and filter by multiple tags
- **Full-Text Search** — SQLite FTS5-powered search across all note titles and content
- **Auto-Save** — Automatic save with configurable debounce (default: 3 seconds)
- **Import/Export** — Import `.md` files or folders; export notes with YAML Front Matter
- **Context Menus** — Right-click menus for folders and notes (new, rename, delete, move)
- **Pinned Notes** — Pin important notes to the top of the list
- **Dark Mode** — Light and dark theme support
- **Keyboard Shortcuts** — Comprehensive shortcut keys for power users
- **Fully Offline** — All data stored locally, no internet connection required

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm (comes with Node.js)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd note-app

# Install dependencies
npm install

# Start in development mode
npm run dev
```

## Build

Build the application for production distribution:

```bash
# Package and create installers
npm run build
```

This runs `electron-forge make`, which:

1. Compiles TypeScript and bundles with Vite
2. Packages the Electron app
3. Creates platform-specific installers:
   - **Windows**: Squirrel installer (`.exe`) + ZIP archive
   - **macOS**: ZIP archive
   - **Linux**: (configure makers in `forge.config.ts`)

Build output is located in the `out/` directory:

```
out/
├── make/            # Installers (Squirrel .exe, .zip)
└── note-app-win32-x64/  # Packaged app directory
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+Shift+N` | New folder |
| `Ctrl+S` | Save current note |
| `Ctrl+K` | Focus search bar |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+B` | Bold selected text |
| `Ctrl+I` | Italicize selected text |
| `Ctrl+E` | Toggle edit/preview mode |
| `Ctrl+Shift+E` | Toggle split-pane mode |
| `Ctrl+\` | Toggle sidebar |
| `Delete` | Delete selected note/folder (with confirmation) |
| `F2` | Rename folder |

## Project Structure

```
note-app/
├── forge.config.ts              # Electron Forge build configuration
├── package.json
├── tsconfig.json
├── vite.main.config.ts          # Vite config for main process
├── vite.preload.config.ts       # Vite config for preload scripts
├── vite.renderer.config.ts      # Vite config for renderer process
│
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry point
│   │   ├── ipc-handlers.ts      # IPC handler registration
│   │   ├── menu.ts              # Application menu
│   │   ├── window-manager.ts    # Window lifecycle management
│   │   └── dialog.ts            # System dialog wrappers
│   │
│   ├── preload/                 # Preload scripts (contextBridge)
│   │   └── index.ts             # Secure API bridge
│   │
│   ├── renderer/                # Vue 3 renderer process
│   │   ├── index.html           # Entry HTML
│   │   ├── main.ts              # Vue app bootstrap
│   │   ├── App.vue              # Root component
│   │   │
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, MainPanel
│   │   │   ├── tree/            # FolderTree, NoteListItem, ContextMenu
│   │   │   ├── editor/          # MarkdownEditor, EditorToolbar, Preview
│   │   │   └── tags/            # TagPanel, TagInput
│   │   │
│   │   ├── stores/              # Pinia state stores
│   │   │   ├── note-store.ts
│   │   │   ├── folder-store.ts
│   │   │   ├── tag-store.ts
│   │   │   └── ui-store.ts
│   │   │
│   │   ├── composables/         # Vue composables
│   │   │   ├── use-markdown.ts
│   │   │   ├── use-auto-save.ts
│   │   │   ├── use-import-export.ts
│   │   │   └── use-keyboard.ts
│   │   │
│   │   └── styles/              # SCSS stylesheets
│   │       ├── variables.scss
│   │       ├── global.scss
│   │       └── markdown-theme.scss
│   │
│   ├── core/                    # Shared business logic
│   │   ├── services/            # Note, Folder, Tag, Search, Import/Export
│   │   ├── models/              # Data model definitions
│   │   └── database/            # SQLite connection, migrations, repositories
│   │
│   └── shared/                  # Main/renderer shared code
│       ├── types.ts             # TypeScript type definitions
│       ├── constants.ts         # App constants
│       └── ipc-channels.ts      # IPC channel name constants
│
├── data/                        # Runtime data (auto-created)
│   ├── notes/                   # Markdown files ({uuid}.md)
│   ├── attachments/             # Note attachments (images, etc.)
│   └── metadata.db              # SQLite metadata database
│
└── docs/
    └── architecture.md          # Architecture design document
```

## License

MIT

## Acknowledgments

- [Electron](https://www.electronjs.org/) — Cross-platform desktop framework
- [Vue 3](https://vuejs.org/) — Progressive JavaScript framework
- [CodeMirror 6](https://codemirror.net/) — Extensible code editor
- [Element Plus](https://element-plus.org/) — Vue 3 UI component library
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown parser

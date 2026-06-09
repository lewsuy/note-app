<template>
  <div class="main-panel">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button size="small" type="primary" @click="handleNewNote">
          <el-icon><EditPen /></el-icon>
          <span>新建笔记</span>
        </el-button>
      </div>
      <div class="toolbar-center">
        <el-input
          ref="searchInputRef"
          v-model="searchKeyword"
          placeholder="搜索笔记... (Ctrl+F)"
          size="small"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleClearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="toolbar-right">
        <el-tooltip content="导入 .md 文件" placement="bottom" :show-after="500">
          <el-button size="small" text @click="handleImportFiles">
            <el-icon><Upload /></el-icon>
          </el-button>
        </el-tooltip>
        <el-button-group size="small">
          <el-button
            :type="viewMode === 'edit' ? 'primary' : 'default'"
            @click="uiStore.setViewMode('edit')"
          >编辑</el-button>
          <el-button
            :type="viewMode === 'split' ? 'primary' : 'default'"
            @click="uiStore.setViewMode('split')"
          >分栏</el-button>
          <el-button
            :type="viewMode === 'preview' ? 'primary' : 'default'"
            @click="uiStore.setViewMode('preview')"
          >预览</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 笔记列表（左侧） -->
      <div class="note-list-panel" v-if="!noteStore.currentNote">
        <div class="note-list">
          <div
            v-for="note in (noteStore.notes as any[])"
            :key="note.id"
            class="note-item"
            :class="{ active: currentNoteId === note.id }"
            @click="handleSelectNote(note.id)"
            @contextmenu="onNoteContextMenu($event, note.id)"
          >
            <div class="note-title">{{ note.title }}</div>
            <div class="note-tags" v-if="note.tags && note.tags.length > 0">
              <span
                v-for="tagName in note.tags.slice(0, 3)"
                :key="tagName"
                class="note-tag-chip"
              >{{ tagName }}</span>
              <span v-if="note.tags.length > 3" class="note-tag-more">+{{ note.tags.length - 3 }}</span>
            </div>
            <div class="note-meta">
              <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
              <span class="note-words">{{ note.wordCount }} 字</span>
            </div>
          </div>
          <div v-if="noteStore.notes.length === 0" class="empty-hint">
            <el-empty description="暂无笔记，点击上方按钮新建" :image-size="80" />
          </div>
        </div>
      </div>

      <!-- 编辑器区域 -->
      <div v-if="noteStore.currentNote" class="editor-area">
        <!-- 笔记标题 -->
        <div class="note-header">
          <input
            class="note-title-input"
            v-model="noteTitle"
            placeholder="笔记标题"
            @blur="handleTitleBlur"
          />
          <el-tooltip content="导出为 .md 文件" placement="bottom" :show-after="500">
            <el-button size="small" text @click="handleExportNote">
              <el-icon><Download /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button size="small" text type="danger" @click="handleDeleteNote">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>

        <!-- 标签输入区 -->
        <div class="tag-bar" v-if="noteStore.currentNote">
          <TagInput
            :note-id="noteStore.currentNote.id"
            :model-tags="noteStore.currentNote.tags || []"
            @tags-changed="handleTagsChanged"
          />
        </div>

        <!-- 编辑/预览（含可拖拽分栏） -->
        <div class="editor-body" :class="viewMode">
          <div
            v-if="viewMode !== 'preview'"
            class="editor-pane"
            :style="viewMode === 'split' ? { width: splitPercent + '%' } : {}"
          >
            <MarkdownEditor
              v-model="editorContent"
              @update:modelValue="handleContentChange"
            />
          </div>
          <!-- 分栏拖拽条 -->
          <div
            v-if="viewMode === 'split'"
            class="split-resizer"
            @mousedown="onSplitResizeStart"
          ></div>
          <div
            v-if="viewMode !== 'edit'"
            class="preview-pane"
            :style="viewMode === 'split' ? { width: (100 - splitPercent) + '%' } : {}"
          >
            <div class="markdown-preview" v-html="renderedHtml"></div>
          </div>
        </div>

        <!-- 状态栏 -->
        <div class="status-bar">
          <span>字数: {{ noteStore.currentNote?.wordCount || 0 }}</span>
          <span>最后修改: {{ formatDate(noteStore.currentNote?.updatedAt || '') }}</span>
          <span v-if="isSaving" class="saving-indicator">保存中...</span>
          <span v-else class="saved-indicator">已保存</span>
        </div>
      </div>
    </div>

    <!-- 笔记右键菜单 -->
    <NoteContextMenu ref="noteContextMenuRef" @action="handleNoteContextAction" />

    <!-- 移动笔记对话框 -->
    <el-dialog v-model="moveDialogVisible" title="移动笔记到目录" width="360px">
      <el-tree
        :data="folderStore.tree"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        highlight-current
        default-expand-all
        @node-click="handleMoveTargetSelect"
      />
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!moveTargetFolderId" @click="confirmMoveNote">确定移动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { EditPen, Search, Delete, Upload, Download } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import TagInput from '../tags/TagInput.vue';
import NoteContextMenu from '../editor/NoteContextMenu.vue';
import type { NoteContextAction } from '../editor/NoteContextMenu.vue';
import { useNoteStore } from '../../stores/note-store';
import { useFolderStore } from '../../stores/folder-store';
import { useUiStore } from '../../stores/ui-store';
import { useTagStore } from '../../stores/tag-store';
import { useKeyboard } from '../../composables/use-keyboard';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import markdownItMark from 'markdown-it-mark';
import '../../styles/markdown-theme.scss';

const noteStore = useNoteStore();
const folderStore = useFolderStore();
const uiStore = useUiStore();
const tagStore = useTagStore();

const searchKeyword = ref('');
const searchInputRef = ref();
const noteTitle = ref('');
const editorContent = ref('');
const isSaving = ref(false);
const splitPercent = ref(50);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const viewMode = computed(() => uiStore.viewMode);
const currentNoteId = computed(() => noteStore.currentNote?.id ?? '');

// ─── 笔记右键菜单 ────────────────────────────────

const noteContextMenuRef = ref<InstanceType<typeof NoteContextMenu>>();
const moveDialogVisible = ref(false);
const moveTargetFolderId = ref<string | null>(null);
const moveSourceNoteId = ref('');

function onNoteContextMenu(event: MouseEvent, noteId: string) {
  noteContextMenuRef.value?.open(event, noteId);
}

async function handleNoteContextAction(action: NoteContextAction, noteId: string) {
  switch (action) {
    case 'open':
      await noteStore.loadById(noteId);
      break;
    case 'delete':
      await deleteNoteById(noteId);
      break;
    case 'move':
      moveSourceNoteId.value = noteId;
      moveTargetFolderId.value = null;
      moveDialogVisible.value = true;
      break;
    case 'export':
      await exportNoteById(noteId);
      break;
  }
}

function handleMoveTargetSelect(data: any) {
  moveTargetFolderId.value = data.id;
}

async function confirmMoveNote() {
  if (!moveTargetFolderId.value || !moveSourceNoteId.value) return;
  try {
    await noteStore.moveNotes([moveSourceNoteId.value], moveTargetFolderId.value);
    ElMessage.success('笔记已移动');
  } catch {
    ElMessage.error('移动笔记失败');
  }
  moveDialogVisible.value = false;
}

async function deleteNoteById(id: string) {
  const note = noteStore.notes.find((n: any) => n.id === id);
  const title = note?.title || '该笔记';
  try {
    await ElMessageBox.confirm(`确定要删除"${title}"吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await noteStore.deleteNote(id);
    ElMessage.success('笔记已删除');
  } catch {
    // 用户取消
  }
}

async function exportNoteById(noteId: string) {
  const note = noteStore.notes.find((n: any) => n.id === noteId);
  const title = note?.title || '笔记';
  try {
    const result = await window.api.io.exportNoteDialog(noteId, title);
    if (result) {
      ElMessage.success('导出成功');
    }
  } catch {
    ElMessage.error('导出失败');
  }
}

// ─── Markdown 渲染器 ─────────────────────────────

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {}
    }
    return '';
  },
});

md.enable('table');
md.enable('list');

const defaultRender = md.renderer.rules.list_item_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.list_item_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const nextToken = tokens[idx + 1];
  if (nextToken && nextToken.children && nextToken.children.length > 0) {
    const firstChild = nextToken.children[0];
    if (firstChild && firstChild.type === 'html_inline' && firstChild.content.includes('checkbox')) {
      token.attrSet('class', 'task-list-item');
    }
  }
  return defaultRender(tokens, idx, options, env, self);
};

const defaultFence = md.renderer.rules.fence
  ? md.renderer.rules.fence.bind(md.renderer.rules)
  : function(tokens: any, idx: any, options: any, env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info.trim();
  const langName = info.split(/\s+/g)[0] || '';
  if (langName) {
    token.attrSet('class', `language-${langName}`);
  }
  return defaultFence(tokens, idx, options, env, self);
};

const renderedHtml = computed(() => {
  return md.render(editorContent.value);
});

// ─── 监听当前笔记变化 ─────────────────────────────

watch(() => noteStore.currentNote, (note) => {
  if (note) {
    noteTitle.value = note.title;
    editorContent.value = (note as any).content || '';
  }
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function handleNewNote() {
  const folderId = folderStore.currentFolderId || folderStore.tree[0]?.id;
  if (!folderId) {
    ElMessage.warning('请先创建一个目录');
    return;
  }
  try {
    const note = await noteStore.createNote({
      title: '新笔记',
      folderId,
      content: '',
    });
    if (note) {
      await noteStore.loadById(note.id);
    }
  } catch (err) {
    ElMessage.error('创建笔记失败');
  }
}

async function handleSelectNote(id: string) {
  await noteStore.loadById(id);
}

async function handleTitleBlur() {
  if (!noteStore.currentNote) return;
  if (noteTitle.value !== noteStore.currentNote.title) {
    await noteStore.updateNote(noteStore.currentNote.id, { title: noteTitle.value });
  }
}

function handleContentChange(content: string) {
  editorContent.value = content;
  // 防抖自动保存
  if (saveTimer) clearTimeout(saveTimer);
  isSaving.value = true;
  saveTimer = setTimeout(async () => {
    if (noteStore.currentNote) {
      await noteStore.updateNote(noteStore.currentNote.id, { content });
      isSaving.value = false;
    }
  }, 3000);
}

async function handleDeleteNote() {
  if (!noteStore.currentNote) return;
  await deleteNoteById(noteStore.currentNote.id);
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) return;
  try {
    const results = await window.api.note.search(searchKeyword.value);
    noteStore.notes = results.map((r: any) => ({
      id: r.noteId,
      title: r.title,
      folderId: r.folderPath,
      filePath: '',
      isPinned: false,
      wordCount: 0,
      tags: [],
      createdAt: '',
      updatedAt: '',
    }));
  } catch (err) {
    ElMessage.error('搜索失败');
  }
}

function handleClearSearch() {
  if (folderStore.currentFolderId) {
    noteStore.loadByFolder(folderStore.currentFolderId);
  }
}

/** 标签变化后刷新笔记列表 */
function handleTagsChanged() {
  if (folderStore.currentFolderId) {
    noteStore.loadByFolder(folderStore.currentFolderId);
  }
  tagStore.loadTags();
}

// ─── 导入导出 ─────────────────────────────────────

async function handleImportFiles() {
  const folderId = folderStore.currentFolderId || folderStore.tree[0]?.id;
  if (!folderId) {
    ElMessage.warning('请先选择一个目录');
    return;
  }
  try {
    const result = await window.api.io.importFilesDialog(folderId);
    if (result) {
      ElMessage.success(`成功导入 ${Array.isArray(result) ? result.length : 1} 个文件`);
      await noteStore.loadByFolder(folderId);
    }
  } catch {
    ElMessage.error('导入失败');
  }
}

async function handleExportNote() {
  if (!noteStore.currentNote) return;
  await exportNoteById(noteStore.currentNote.id);
}

// ─── 分栏拖拽 ────────────────────────────────────

function onSplitResizeStart(e: MouseEvent) {
  e.preventDefault();
  const editorBody = (e.target as HTMLElement).closest('.editor-body');
  if (!editorBody) return;

  const rect = editorBody.getBoundingClientRect();
  const startX = e.clientX;

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX;
    const percent = ((ev.clientX - rect.left) / rect.width) * 100;
    splitPercent.value = Math.max(20, Math.min(80, percent));
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ─── 保存当前笔记（供快捷键调用） ────────────────

async function handleSaveNow() {
  if (!noteStore.currentNote) return;
  if (saveTimer) clearTimeout(saveTimer);
  isSaving.value = true;
  await noteStore.updateNote(noteStore.currentNote.id, { content: editorContent.value });
  isSaving.value = false;
}

// ─── 键盘快捷键 ──────────────────────────────────

useKeyboard({
  onNewNote: handleNewNote,
  onSave: handleSaveNow,
  onFocusSearch: () => {
    searchInputRef.value?.focus();
  },
  onNewFolder: async () => {
    try {
      const { value } = await ElMessageBox.prompt('请输入目录名称', '新建目录', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '目录名称不能为空',
      });
      await folderStore.createFolder({ name: value });
    } catch {
      // 用户取消
    }
  },
  onDeleteNote: handleDeleteNote,
  onToggleEditPreview: () => {
    const current = uiStore.viewMode;
    uiStore.setViewMode(current === 'edit' ? 'preview' : 'edit');
  },
  onToggleSplit: () => {
    uiStore.setViewMode(uiStore.viewMode === 'split' ? 'edit' : 'split');
  },
});
</script>

<style lang="scss" scoped>
.main-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--content-bg);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-center {
  flex: 1;
  max-width: 400px;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.note-list-panel {
  width: 260px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
}

.note-list {
  padding: 4px;
}

.note-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--hover-bg);
  }

  &.active {
    background: var(--primary-light);
  }
}

.note-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.note-tag-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--primary-light);
  color: var(--primary-color);
  white-space: nowrap;
}

.note-tag-more {
  font-size: 10px;
  color: var(--text-tertiary);
}

.note-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.empty-hint {
  padding: 40px 16px;
  text-align: center;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.note-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
}

.note-title-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  background: transparent;
  padding: 4px 0;

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.tag-bar {
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;

  &.edit .editor-pane {
    flex: 1;
  }

  &.preview .preview-pane {
    flex: 1;
  }

  &.split {
    .editor-pane {
      overflow: hidden;
    }

    .preview-pane {
      overflow-y: auto;
      border-left: none;
    }
  }
}

.split-resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s;
  position: relative;

  &:hover,
  &:active {
    background: var(--primary-color);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 24px;
    background: var(--text-tertiary);
    border-radius: 1px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover::after {
    opacity: 0.5;
  }
}

.editor-pane,
.preview-pane {
  overflow-y: auto;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 16px;
  font-size: 11px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.saving-indicator {
  color: var(--warning-color);
}

.saved-indicator {
  color: var(--success-color);
}
</style>

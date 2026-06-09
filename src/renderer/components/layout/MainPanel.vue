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
          v-model="searchKeyword"
          placeholder="搜索笔记... (Ctrl+K)"
          size="small"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="toolbar-right">
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
          >
            <div class="note-title">{{ note.title }}</div>
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
          <el-button size="small" text type="danger" @click="handleDeleteNote">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>

        <!-- 编辑/预览 -->
        <div class="editor-body" :class="viewMode">
          <div v-if="viewMode !== 'preview'" class="editor-pane">
            <MarkdownEditor
              v-model="editorContent"
              @update:modelValue="handleContentChange"
            />
          </div>
          <div v-if="viewMode !== 'edit'" class="preview-pane">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { EditPen, Search, Delete } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import MarkdownEditor from '../editor/MarkdownEditor.vue';
import { useNoteStore } from '../../stores/note-store';
import { useFolderStore } from '../../stores/folder-store';
import { useUiStore } from '../../stores/ui-store';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const noteStore = useNoteStore();
const folderStore = useFolderStore();
const uiStore = useUiStore();

const searchKeyword = ref('');
const noteTitle = ref('');
const editorContent = ref('');
const isSaving = ref(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const viewMode = computed(() => uiStore.viewMode);
const currentNoteId = computed(() => noteStore.currentNote?.id ?? '');

// Markdown 渲染器
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

const renderedHtml = computed(() => {
  return md.render(editorContent.value);
});

// 监听当前笔记变化
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
  try {
    await ElMessageBox.confirm('确定要删除这篇笔记吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await noteStore.deleteNote(noteStore.currentNote.id);
    ElMessage.success('笔记已删除');
  } catch {
    // 用户取消
  }
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
    .editor-pane,
    .preview-pane {
      flex: 1;
    }

    .preview-pane {
      border-left: 1px solid var(--border-color);
    }
  }
}

.editor-pane,
.preview-pane {
  overflow-y: auto;
}

.markdown-preview {
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
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

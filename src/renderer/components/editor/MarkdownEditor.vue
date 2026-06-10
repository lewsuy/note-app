<template>
  <div class="editor-wrapper">
    <EditorToolbar @action="handleToolbarAction" @code-block="handleCodeBlock" />
    <div ref="editorContainer" class="markdown-editor"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import EditorToolbar from './EditorToolbar.vue';
import type { ToolbarAction } from './EditorToolbar.vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorContainer = ref<HTMLElement>();
const editorView = shallowRef<EditorView>();

// ─── 主题 ─────────────────────────────────────────

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '16px 0',
    lineHeight: '1.8',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-gutters': {
    background: 'transparent',
    border: 'none',
    color: '#c0c4cc',
  },
  '.cm-activeLineGutter': {
    background: 'transparent',
  },
  '.cm-activeLine': {
    background: 'rgba(64, 158, 255, 0.04)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'rgba(64, 158, 255, 0.15) !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#409EFF',
    borderLeftWidth: '2px',
  },
  // Markdown 语法高亮色
  '.cm-header': { color: '#303133', fontWeight: '700' },
  '.cm-header-1': { fontSize: '1.4em' },
  '.cm-header-2': { fontSize: '1.25em' },
  '.cm-header-3': { fontSize: '1.1em' },
  '.cm-strong': { fontWeight: '700' },
  '.cm-emphasis': { fontStyle: 'italic' },
  '.cm-link': { color: '#409EFF', textDecoration: 'underline' },
  '.cm-url': { color: '#909399' },
  '.cm-quote': { color: '#67C23A', borderLeft: '3px solid #67C23A', paddingLeft: '8px' },
  '.cm-keyword': { color: '#c678dd' },
  '.cm-atom': { color: '#d19a66' },
  '.cm-number': { color: '#d19a66' },
  '.cm-def': { color: '#61afef' },
  '.cm-variable': { color: '#e06c75' },
  '.cm-property': { color: '#e06c75' },
  '.cm-operator': { color: '#56b6c2' },
  '.cm-comment': { color: '#5c6370', fontStyle: 'italic' },
  '.cm-string': { color: '#98c379' },
});

// ─── 内容变化监听 ─────────────────────────────────

const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const content = update.state.doc.toString();
    emit('update:modelValue', content);
  }
});

// ─── 创建编辑器 ───────────────────────────────────

function createEditor(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      editorTheme,
      updateListener,
      keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
      ]),
      EditorView.lineWrapping,
    ],
  });

  return new EditorView({
    state,
    parent: editorContainer.value,
  });
}

// ─── 工具栏操作 ───────────────────────────────────

/** 根据工具栏动作插入对应 Markdown 语法 */
function handleToolbarAction(action: ToolbarAction) {
  const view = editorView.value;
  if (!view) return;

  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  let insert = '';
  let cursorOffset = 0; // 光标相对插入文本起始位置的偏移

  switch (action) {
    case 'bold':
      insert = `**${selected || '粗体文本'}**`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'italic':
      insert = `*${selected || '斜体文本'}*`;
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'h1':
      insert = `# ${selected || '标题'}`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'h2':
      insert = `## ${selected || '标题'}`;
      cursorOffset = selected ? insert.length : 3;
      break;
    case 'h3':
      insert = `### ${selected || '标题'}`;
      cursorOffset = selected ? insert.length : 4;
      break;
    case 'code':
      if (selected.includes('\n')) {
        insert = `\`\`\`\n${selected}\n\`\`\``;
        cursorOffset = 4;
      } else {
        insert = `\`${selected || '代码'}\``;
        cursorOffset = selected ? insert.length : 2;
      }
      break;
    case 'link':
      insert = `[${selected || '链接文本'}](url)`;
      cursorOffset = selected ? insert.length - 4 : 1;
      break;
    case 'image':
      insert = `![${selected || '图片描述'}](url)`;
      cursorOffset = selected ? insert.length - 4 : 2;
      break;
    case 'ul':
      insert = `- ${selected || '列表项'}`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'ol':
      insert = `1. ${selected || '列表项'}`;
      cursorOffset = selected ? insert.length : 3;
      break;
    case 'task':
      insert = `- [ ] ${selected || '任务'}`;
      cursorOffset = selected ? insert.length : 6;
      break;
    case 'table':
      insert = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |';
      cursorOffset = 2;
      break;
    case 'hr':
      insert = '\n---\n';
      cursorOffset = insert.length;
      break;
  }

  // 如果光标在行首且插入的是 block 元素，先检查是否需要换行
  const line = view.state.doc.lineAt(from);
  const textBefore = view.state.sliceDoc(line.from, from);
  if (['h1', 'h2', 'h3'].includes(action) && textBefore.trim().length > 0) {
    insert = '\n' + insert;
    cursorOffset += 1;
  }

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset },
  });
  view.focus();
}

/** 插入带语言标记的代码块 */
function handleCodeBlock(language: string) {
  const view = editorView.value;
  if (!view) return;

  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  const fence = language ? `\`\`\`${language}` : '```';
  const insert = `${fence}\n${selected || ''}\n\`\`\``;
  const cursorOffset = fence.length + 1; // position cursor after the opening fence + newline

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset },
  });
  view.focus();
}

// ─── 生命周期 ─────────────────────────────────────

onMounted(() => {
  if (editorContainer.value) {
    editorView.value = createEditor(props.modelValue || '');
  }
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
});

// ─── 外部内容变化同步 ─────────────────────────────

watch(
  () => props.modelValue,
  (newContent) => {
    if (!editorView.value) return;
    const currentContent = editorView.value.state.doc.toString();
    if (newContent !== currentContent) {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: editorView.value.state.doc.length,
          insert: newContent || '',
        },
      });
    }
  }
);

// ─── 暴露方法供外部调用 ───────────────────────────

/** 获取编辑器实例（供快捷键 composable 等使用） */
defineExpose({
  getEditorView: () => editorView.value,
});
</script>

<style lang="scss" scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.markdown-editor {
  flex: 1;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
  }
}
</style>

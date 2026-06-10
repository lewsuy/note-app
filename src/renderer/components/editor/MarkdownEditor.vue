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
import { codeBlockPlugin } from './code-block-plugin';

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

// ─── Enter key: auto-complete fenced code blocks ──

/**
 * When the cursor is on a line that is just ``` or ```lang, pressing Enter
 * should create the fenced code block structure:
 *   ```bash
 *   <cursor>
 *   ```
 */
const fencedCodeBlockEnter: import('@codemirror/state').Extension = EditorView.domEventHandlers({
  keydown(event, view) {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const lineText = line.text;

    // Match a line that is exactly ``` optionally followed by a language tag
    // Only trigger when cursor is at the very end of that line
    const fenceMatch = lineText.match(/^```(\w*)\s*$/);
    if (!fenceMatch || head !== line.to) {
      return false;
    }

    // Insert: newline after fence, empty line for code, closing ```, and place cursor on the empty line
    const insertText = '\n\n```';
    const cursorPos = head + 1; // on the empty line between the fences

    view.dispatch({
      changes: { from: head, to: head, insert: insertText },
      selection: { anchor: cursorPos },
    });

    return true;
  },
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
      fencedCodeBlockEnter,
      codeBlockPlugin(),
      editorTheme,
      updateListener,
      keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        { key: 'Tab', run: (view) => {
          view.dispatch(view.state.replaceSelection('    '));
          return true;
        }},
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

<style lang="scss">
// ─── Code Block Styles (global, not scoped) ──────────

// Code block lines - dark theme background
.cm-line:has(.cm-code-block-start),
.cm-line:has(.cm-code-block-line),
.cm-line:has(.cm-code-block-end) {
  background: #1e1e2e !important;
  color: #cdd6f4;
  padding-left: 0 !important;
  position: relative;

  // Counter for line numbers
  counter-increment: cm-code-line;
}

// Opening fence line
.cm-line:has(.cm-code-block-start) {
  border-radius: 8px 8px 0 0;
  padding-top: 2px;
  counter-reset: cm-code-line;
  counter-increment: none;
  padding-left: 16px !important;
}

// Closing fence line
.cm-line:has(.cm-code-block-end) {
  border-radius: 0 0 8px 8px;
  padding-bottom: 2px;
  counter-increment: none;
  padding-left: 16px !important;
}

// Code content lines - add line numbers
.cm-line:has(.cm-code-block-line) {
  padding-left: 52px !important;
  position: relative;

  &::before {
    content: counter(cm-code-line);
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    padding-right: 8px;
    text-align: right;
    color: #585b70;
    font-size: 12px;
    line-height: inherit;
    user-select: none;
    pointer-events: none;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
  }
}

// ─── Toolbar ──────────────────────────────────────

.cm-code-block-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #181825;
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  position: relative;
  z-index: 10;
  min-height: 32px;
}

// Show toolbar on hover of code block area
.cm-line:has(.cm-code-block-start):hover + .cm-widgetElement + .cm-line,
.cm-line:has(.cm-code-block-line):hover ~ .cm-line,
.cm-line:has(.cm-code-block-end):hover ~ .cm-line {
  // This doesn't work well. Let's use a different approach.
}

// Better approach: Use container hover detection
// When any code block line is hovered, show the toolbar
.cm-line:has(.cm-code-block-start):hover,
.cm-line:has(.cm-code-block-line):hover,
.cm-line:has(.cm-code-block-end):hover {
  // Find sibling toolbar
  & ~ .cm-widgetElement .cm-code-block-toolbar,
  & + .cm-widgetElement .cm-code-block-toolbar {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
}

// Actually, the toolbar is BEFORE the code block lines, so we need :has()
// The toolbar is a .cm-widgetElement before the .cm-code-block-start line
// We need: .cm-widgetElement:has(.cm-code-block-toolbar) when sibling .cm-line is hovered

// Use :has() to detect hover on any sibling code block line
:is(.cm-line:has(.cm-code-block-start), .cm-line:has(.cm-code-block-line), .cm-line:has(.cm-code-block-end)):hover ~ * .cm-code-block-toolbar {
  // This won't work because toolbar is BEFORE the lines
}

// Let's use a completely different approach - wrap in a container
// The plugin will handle the DOM wrapping, and we use the parent container's hover

// For now, use a JS-based hover approach
// The toolbar visibility is toggled via a data attribute

// Language label
.cb-lang-label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: #313244;
  border-radius: 4px;
  color: #cdd6f4;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  user-select: none;

  &:hover {
    background: #45475a;
  }
}

.cb-lang-arrow {
  font-size: 10px;
  color: #6c7086;
  margin-left: 2px;
}

// Language dropdown
.cb-lang-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 140px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  // Scrollbar
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }
}

.cb-lang-item {
  padding: 6px 12px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.1s;

  &:hover {
    background: #313244;
  }

  &.cb-lang-item-active {
    color: #89b4fa;
    font-weight: 500;
  }
}

// Copy button
.cb-copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #313244;
  border-radius: 4px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
  user-select: none;

  &:hover {
    background: #45475a;
  }

  &:active {
    background: #585b70;
  }
}

// Toast notification
.cb-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #1e1e2e;
  color: #a6e3a1;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 10000;
  pointer-events: none;

  &.cb-toast-show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

// Syntax highlighting overrides for code blocks
.cm-line:has(.cm-code-block-line) {
  .cm-keyword { color: #cba6f7; }
  .cm-string { color: #a6e3a1; }
  .cm-number { color: #fab387; }
  .cm-comment { color: #6c7086; font-style: italic; }
  .cm-variable { color: #f38ba8; }
  .cm-property { color: #89b4fa; }
  .cm-def { color: #89dceb; }
  .cm-operator { color: #94e2d5; }
  .cm-atom { color: #fab387; }
}
</style>

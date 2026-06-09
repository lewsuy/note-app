<template>
  <div ref="editorContainer" class="markdown-editor"></div>
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
</script>

<style lang="scss" scoped>
.markdown-editor {
  height: 100%;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
  }
}
</style>

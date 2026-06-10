/**
 * CodeMirror 6 ViewPlugin for professional code blocks
 * Features: language label, copy button, line numbers, hover effects
 */

import { EditorView, ViewPlugin, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';

// ─── Language list ────────────────────────────────────

interface LangInfo {
  value: string;
  label: string;
}

const LANGUAGES: LangInfo[] = [
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'yaml', label: 'YAML' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'nginx', label: 'Nginx' },
  { value: '', label: 'Plain Text' },
];

// Map common aliases to canonical values
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps: 'powershell',
  ps1: 'powershell',
  yml: 'yaml',
  md: 'markdown',
  'c#': 'csharp',
  'c++': 'cpp',
  kt: 'kotlin',
  docker: 'dockerfile',
};

function normalizeLang(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANG_ALIASES[lower] || lower;
}

function langLabel(lang: string): string {
  const normalized = normalizeLang(lang);
  const found = LANGUAGES.find(l => l.value === normalized);
  return found ? found.label : (normalized || 'Plain Text');
}

// ─── Toolbar Widget ───────────────────────────────────

class CodeBlockToolbarWidget extends WidgetType {
  private lang: string;
  private codeText: string;

  constructor(lang: string, codeText: string) {
    super();
    this.lang = lang;
    this.codeText = codeText;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-code-block-toolbar';

    // Language label
    const langLabelEl = document.createElement('div');
    langLabelEl.className = 'cb-lang-label';
    langLabelEl.textContent = langLabel(this.lang);

    // Dropdown arrow
    const arrow = document.createElement('span');
    arrow.className = 'cb-lang-arrow';
    arrow.textContent = '▾';
    langLabelEl.appendChild(arrow);

    // Language dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'cb-lang-dropdown';
    dropdown.style.display = 'none';

    // Dropdown items
    LANGUAGES.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'cb-lang-item';
      if (lang.value === normalizeLang(this.lang)) {
        item.classList.add('cb-lang-item-active');
      }
      item.textContent = lang.label;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.changeLanguage(view, lang.value);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(item);
    });

    // Toggle dropdown on label click
    langLabelEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    langLabelEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isVisible = dropdown.style.display !== 'none';
      dropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    }, { once: true });

    // Copy button
    const copyBtn = document.createElement('div');
    copyBtn.className = 'cb-copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.copyCode(view);
    });

    container.appendChild(langLabelEl);
    container.appendChild(dropdown);
    container.appendChild(copyBtn);

    // Prevent mousedown on toolbar from blurring editor
    container.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    return container;
  }

  private changeLanguage(view: EditorView, newLang: string) {
    // Find the opening fence line and update the language
    const tree = syntaxTree(view.state);
    let changed = false;

    tree.iterate({
      enter: (node: SyntaxNodeRef) => {
        if (changed) return;
        if (node.name === 'FencedCode') {
          // Find CodeInfo child
          let child = node.node.firstChild;
          while (child) {
            if (child.name === 'CodeInfo') {
              const langText = view.state.sliceDoc(child.from, child.to);
              const currentNormalized = normalizeLang(langText);
              const newNormalized = normalizeLang(newLang);

              if (currentNormalized !== newNormalized) {
                const displayLang = newLang || '';
                view.dispatch({
                  changes: { from: child.from, to: child.to, insert: displayLang },
                });
              }
              changed = true;
              break;
            }
            child = child.nextSibling;
          }
        }
      },
    });
  }

  private copyCode(view: EditorView) {
    const code = this.codeText;
    navigator.clipboard.writeText(code).then(() => {
      // Show toast notification
      showToast('复制成功');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('复制成功');
    });
  }

  eq(other: CodeBlockToolbarWidget): boolean {
    return this.lang === other.lang && this.codeText === other.codeText;
  }
}

// ─── Toast notification ───────────────────────────────

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'cb-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('cb-toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('cb-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

// ─── Decoration Mark Classes ──────────────────────────

const codeBlockStartMark = Decoration.line({ attributes: { class: 'cm-code-block-start' } });
const codeBlockLineMark = Decoration.line({ attributes: { class: 'cm-code-block-line' } });
const codeBlockEndMark = Decoration.line({ attributes: { class: 'cm-code-block-end' } });

// ─── State Effect for forcing decoration updates ──────

const forceUpdate = StateEffect.define<void>();

// ─── ViewPlugin ───────────────────────────────────────

export function codeBlockPlugin(): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: { docChanged: boolean; viewportChanged: boolean; state: EditorView['state']; view: EditorView }) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;
        const tree = syntaxTree(view.state);

        tree.iterate({
          enter: (node: SyntaxNodeRef) => {
            if (node.name !== 'FencedCode') return;

            const from = node.from;
            const to = node.to;

            // Get language from CodeInfo child
            let lang = '';
            let child = node.node.firstChild;
            while (child) {
              if (child.name === 'CodeInfo') {
                lang = doc.sliceString(child.from, child.to);
                break;
              }
              child = child.nextSibling;
            }

            // Get code text (content between fences)
            let codeText = '';
            let codeFrom = from;
            let codeTo = to;
            child = node.node.firstChild;
            while (child) {
              if (child.name === 'CodeText') {
                codeFrom = child.from;
                codeTo = child.to;
                codeText = doc.sliceString(child.from, child.to);
                break;
              }
              child = child.nextSibling;
            }

            // Add toolbar widget before the code block
            builder.add(
              from,
              from,
              Decoration.widget({
                widget: new CodeBlockToolbarWidget(lang, codeText),
                side: -1,
                block: true,
              })
            );

            // Decorate each line in the code block
            const startLine = doc.lineAt(from);
            const endLine = doc.lineAt(to);

            for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
              const line = doc.line(lineNum);
              const lineInBlock = lineNum - startLine.number; // 0-based index within block

              if (lineNum === startLine.number) {
                // Opening fence line
                builder.add(line.from, line.from, codeBlockStartMark);
              } else if (lineNum === endLine.number) {
                // Closing fence line
                builder.add(line.from, line.from, codeBlockEndMark);
              } else {
                // Code content line
                builder.add(
                  line.from,
                  line.from,
                  Decoration.line({
                    attributes: {
                      class: 'cm-code-block-line',
                      'data-line-num': String(lineInBlock),
                    },
                  })
                );
              }
            }
          },
        });

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  return plugin;
}

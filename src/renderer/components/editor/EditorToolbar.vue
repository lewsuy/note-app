<template>
  <div class="editor-toolbar">
    <el-tooltip content="加粗 (Ctrl+B)" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('bold')">
        <strong>B</strong>
      </button>
    </el-tooltip>
    <el-tooltip content="斜体 (Ctrl+I)" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('italic')">
        <em>I</em>
      </button>
    </el-tooltip>

    <span class="toolbar-divider"></span>

    <el-tooltip content="标题 1" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('h1')">H1</button>
    </el-tooltip>
    <el-tooltip content="标题 2" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('h2')">H2</button>
    </el-tooltip>
    <el-tooltip content="标题 3" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('h3')">H3</button>
    </el-tooltip>

    <span class="toolbar-divider"></span>

    <el-tooltip content="代码块" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('code')">
        <el-icon><Tickets /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="链接" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('link')">
        <el-icon><Link /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="图片" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('image')">
        <el-icon><Picture /></el-icon>
      </button>
    </el-tooltip>

    <span class="toolbar-divider"></span>

    <el-tooltip content="无序列表" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('ul')">
        <el-icon><Menu /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="有序列表" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('ol')">
        <span class="ol-icon">1.</span>
      </button>
    </el-tooltip>
    <el-tooltip content="任务列表" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('task')">
        <el-icon><Finished /></el-icon>
      </button>
    </el-tooltip>

    <span class="toolbar-divider"></span>

    <el-tooltip content="表格" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('table')">
        <el-icon><Grid /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="分隔线" placement="bottom" :show-after="500">
      <button class="toolbar-btn" @click="insert('hr')">
        <span class="hr-icon">—</span>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { Link, Picture, Tickets, Menu, Finished, Grid } from '@element-plus/icons-vue';

export type ToolbarAction =
  | 'bold' | 'italic'
  | 'h1' | 'h2' | 'h3'
  | 'code' | 'link' | 'image'
  | 'ul' | 'ol' | 'task'
  | 'table' | 'hr';

const emit = defineEmits<{
  (e: 'action', action: ToolbarAction): void;
}>();

function insert(action: ToolbarAction) {
  emit('action', action);
}
</script>

<style lang="scss" scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color);
  background: var(--content-bg);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  &:active {
    background: var(--primary-light);
    color: var(--primary-color);
  }

  .el-icon {
    font-size: 15px;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.ol-icon {
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.hr-icon {
  font-size: 16px;
  line-height: 1;
}
</style>

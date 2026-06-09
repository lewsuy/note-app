<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="note-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div class="context-menu-item" @click="handleAction('open')">
        <el-icon><View /></el-icon>
        <span>打开</span>
      </div>
      <div class="context-menu-item danger" @click="handleAction('delete')">
        <el-icon><Delete /></el-icon>
        <span>删除</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleAction('move')">
        <el-icon><FolderOpened /></el-icon>
        <span>移动到目录...</span>
      </div>
      <div class="context-menu-item" @click="handleAction('export')">
        <el-icon><Download /></el-icon>
        <span>导出为 .md</span>
      </div>
    </div>
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="close"
      @contextmenu.prevent="close"
    ></div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { Delete, View, FolderOpened, Download } from '@element-plus/icons-vue';

export type NoteContextAction = 'open' | 'delete' | 'move' | 'export';

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const noteId = ref('');

const emit = defineEmits<{
  (e: 'action', action: NoteContextAction, noteId: string): void;
}>();

function open(event: MouseEvent, id: string) {
  event.preventDefault();
  event.stopPropagation();
  noteId.value = id;
  x.value = event.clientX;
  y.value = event.clientY;
  visible.value = true;
}

function close() {
  visible.value = false;
}

function handleAction(action: NoteContextAction) {
  emit('action', action, noteId.value);
  close();
}

defineExpose({ open, close });
</script>

<script lang="ts">
import { ref } from 'vue';
</script>

<style lang="scss" scoped>
.note-context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 170px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  border: 1px solid var(--border-light);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--hover-bg);
  }

  &.danger {
    color: var(--danger-color);

    &:hover {
      background: rgba(245, 108, 108, 0.08);
    }
  }
}

.context-menu-divider {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
}
</style>

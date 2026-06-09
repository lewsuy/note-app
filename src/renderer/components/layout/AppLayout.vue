<template>
  <div class="app-layout">
    <div
      class="sidebar"
      :style="{ width: uiStore.sidebarWidth + 'px' }"
    >
      <Sidebar />
    </div>
    <div
      class="resizer"
      @mousedown="onResizeStart"
    ></div>
    <div class="main-panel">
      <MainPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './Sidebar.vue';
import MainPanel from './MainPanel.vue';
import { useUiStore } from '../../stores/ui-store';

const uiStore = useUiStore();
const isResizing = ref(false);

function onResizeStart(e: MouseEvent) {
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = uiStore.sidebarWidth;

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX;
    const newWidth = Math.max(180, Math.min(500, startWidth + delta));
    uiStore.setSidebarWidth(newWidth);
  };

  const onUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  flex-shrink: 0;
  border-right: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  overflow: hidden;
}

.resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s;

  &:hover,
  &:active {
    background: var(--primary-color);
  }
}

.main-panel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
</style>

<template>
  <div class="folder-tree-node" :class="{ 'is-current': isCurrent }">
    <span class="node-icon">
      <el-icon :size="16">
        <Folder v-if="!isCurrent" />
        <FolderOpened v-else />
      </el-icon>
    </span>
    <span class="node-label">{{ data.name }}</span>
    <span v-if="data.noteCount > 0" class="node-count">{{ data.noteCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { Folder, FolderOpened } from '@element-plus/icons-vue';
import type { FolderTreeNode } from '../../../shared/types';

defineProps<{
  node: any;
  data: FolderTreeNode;
  isCurrent: boolean;
}>();
</script>

<style lang="scss" scoped>
.folder-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding-right: 8px;
}

.node-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--sidebar-text-secondary);

  .is-current & {
    color: var(--primary-color);
  }
}

.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1;
}

.node-count {
  flex-shrink: 0;
  min-width: 20px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 11px;
  color: var(--sidebar-text-secondary);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  padding: 0 5px;
}
</style>

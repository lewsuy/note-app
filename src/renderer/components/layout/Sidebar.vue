<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>笔记应用</h3>
    </div>

    <!-- 目录树区域 -->
    <div class="folder-section">
      <div class="section-header">
        <span>目录</span>
        <el-button size="small" text @click="handleCreateFolder">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
      <FolderTree />
    </div>

    <!-- 标签区域 -->
    <div class="tag-section">
      <TagPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue';
import FolderTree from '../tree/FolderTree.vue';
import TagPanel from '../tags/TagPanel.vue';
import { useFolderStore } from '../../stores/folder-store';
import { ElMessageBox } from 'element-plus';

const folderStore = useFolderStore();

async function handleCreateFolder() {
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
}
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.folder-section {
  flex: 1;
  overflow-y: auto;
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-section {
  flex-shrink: 0;
  max-height: 40%;
  overflow-y: auto;
}
</style>

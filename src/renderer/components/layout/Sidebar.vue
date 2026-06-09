<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>笔记应用</h3>
    </div>

    <!-- 目录树区域 -->
    <div class="folder-section">
      <div class="section-header">
        <span>目录</span>
        <div class="section-actions">
          <el-tooltip content="导入 .md 文件" placement="bottom" :show-after="500">
            <el-button size="small" text @click="handleImportFiles">
              <el-icon><Upload /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="导入文件夹" placement="bottom" :show-after="500">
            <el-button size="small" text @click="handleImportFolder">
              <el-icon><FolderOpened /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button size="small" text @click="handleCreateFolder">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
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
import { Plus, Upload, FolderOpened } from '@element-plus/icons-vue';
import FolderTree from '../tree/FolderTree.vue';
import TagPanel from '../tags/TagPanel.vue';
import { useFolderStore } from '../../stores/folder-store';
import { useNoteStore } from '../../stores/note-store';
import { ElMessageBox, ElMessage } from 'element-plus';

const folderStore = useFolderStore();
const noteStore = useNoteStore();

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

async function handleImportFiles() {
  const folderId = folderStore.currentFolderId || folderStore.tree[0]?.id;
  if (!folderId) {
    ElMessage.warning('请先选择一个目录');
    return;
  }
  try {
    const result = await window.api.io.importFilesDialog(folderId);
    if (result) {
      ElMessage.success(`成功导入 ${Array.isArray(result) ? result.length : 1} 个文件`);
      await noteStore.loadByFolder(folderId);
    }
  } catch {
    ElMessage.error('导入失败');
  }
}

async function handleImportFolder() {
  const folderId = folderStore.currentFolderId || folderStore.tree[0]?.id;
  if (!folderId) {
    ElMessage.warning('请先选择一个目录');
    return;
  }
  try {
    const result = await window.api.io.importFolderDialog(folderId);
    if (result) {
      ElMessage.success(`成功导入 ${result.count} 个文件`);
      await noteStore.loadByFolder(folderId);
    }
  } catch {
    ElMessage.error('导入文件夹失败');
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tag-section {
  flex-shrink: 0;
  max-height: 40%;
  overflow-y: auto;
}
</style>

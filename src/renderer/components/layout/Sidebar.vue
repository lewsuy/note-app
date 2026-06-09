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
      <div class="section-header">
        <span>标签</span>
      </div>
      <div class="tag-list">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :class="{ active: activeTagId === tag.id }"
          @click="handleTagClick(tag.id)"
        >
          <span class="tag-dot" :style="{ background: tag.color }"></span>
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.noteCount }}</span>
        </div>
        <div v-if="tags.length === 0" class="empty-hint">暂无标签</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import FolderTree from '../tree/FolderTree.vue';
import { useFolderStore } from '../../stores/folder-store';
import { useNoteStore } from '../../stores/note-store';
import { ElMessageBox } from 'element-plus';

const folderStore = useFolderStore();
const noteStore = useNoteStore();

const tags = ref<any[]>([]);
const activeTagId = ref<string | null>(null);

onMounted(async () => {
  await loadTags();
});

async function loadTags() {
  try {
    tags.value = await window.api.tag.getAll();
  } catch (err) {
    console.error('加载标签失败:', err);
  }
}

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

async function handleTagClick(tagId: string) {
  activeTagId.value = tagId;
  try {
    const notes = await window.api.tag.getNotesByTag(tagId);
    noteStore.notes = notes;
  } catch (err) {
    console.error('获取标签笔记失败:', err);
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

.tag-section {
  flex-shrink: 0;
  max-height: 40%;
  overflow-y: auto;
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

.tag-list {
  padding: 0 8px 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;

  &:hover {
    background: var(--hover-bg);
  }

  &.active {
    background: var(--primary-light);
    color: var(--primary-color);
  }
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 20px;
  text-align: right;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>

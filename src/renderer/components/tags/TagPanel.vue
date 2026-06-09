// src/renderer/components/tags/TagPanel.vue
// 标签面板 - 显示所有标签，支持筛选

<template>
  <div class="tag-panel">
    <div class="tag-panel-header">
      <span>标签</span>
      <el-button size="small" text @click="handleCreateTag">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <div class="tag-list">
      <div
        v-for="tag in tagStore.tags"
        :key="tag.id"
        class="tag-item"
        :class="{ active: tagStore.activeTagId === tag.id }"
        @click="handleTagClick(tag.id)"
        @contextmenu.prevent="handleContextMenu($event, tag)"
      >
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <span class="tag-name">{{ tag.name }}</span>
        <span class="tag-count">{{ tag.noteCount }}</span>
      </div>

      <div v-if="tagStore.tags.length === 0" class="empty-hint">
        暂无标签
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="handleEditTag">
        <el-icon><Edit /></el-icon>
        <span>编辑标签</span>
      </div>
      <div class="context-menu-item danger" @click="handleDeleteTag">
        <el-icon><Delete /></el-icon>
        <span>删除标签</span>
      </div>
    </div>
    <div
      v-if="contextMenu.visible"
      class="context-menu-overlay"
      @click="closeContextMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onBeforeUnmount } from 'vue';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useTagStore } from '../../stores/tag-store';
import { useNoteStore } from '../../stores/note-store';
import { TAG_COLORS } from '../../../shared/constants';
import type { TagWithCount } from '../../../shared/types';

const tagStore = useTagStore();
const noteStore = useNoteStore();

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  tag: null as TagWithCount | null,
});

onMounted(async () => {
  await tagStore.loadTags();
  document.addEventListener('click', closeContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu);
});

function closeContextMenu() {
  contextMenu.visible = false;
}

/** 点击标签 - 筛选笔记 */
async function handleTagClick(tagId: string) {
  if (tagStore.activeTagId === tagId) {
    // 取消筛选
    tagStore.clearFilter();
    return;
  }
  tagStore.setActiveTag(tagId);
  try {
    const notes = await window.api.tag.getNotesByTag(tagId);
    noteStore.notes = notes;
  } catch (err) {
    console.error('获取标签笔记失败:', err);
  }
}

/** 创建标签 */
async function handleCreateTag() {
  try {
    const { value } = await ElMessageBox.prompt('请输入标签名称', '新建标签', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '标签名称不能为空',
    });
    const color = TAG_COLORS[tagStore.tags.length % TAG_COLORS.length];
    await tagStore.createTag({ name: value, color });
    ElMessage.success('标签已创建');
  } catch {
    // 用户取消
  }
}

/** 右键菜单 */
function handleContextMenu(event: MouseEvent, tag: TagWithCount) {
  contextMenu.visible = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.tag = tag;
}

/** 编辑标签 */
async function handleEditTag() {
  closeContextMenu();
  if (!contextMenu.tag) return;
  try {
    const { value } = await ElMessageBox.prompt('请输入新名称', '编辑标签', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: contextMenu.tag.name,
      inputPattern: /\S+/,
      inputErrorMessage: '标签名称不能为空',
    });
    await tagStore.updateTag(contextMenu.tag.id, { name: value });
    ElMessage.success('标签已更新');
  } catch {
    // 用户取消
  }
}

/** 删除标签 */
async function handleDeleteTag() {
  closeContextMenu();
  if (!contextMenu.tag) return;
  try {
    await ElMessageBox.confirm(
      `确定要删除标签"${contextMenu.tag.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await tagStore.deleteTag(contextMenu.tag.id);
    ElMessage.success('标签已删除');
  } catch {
    // 用户取消
  }
}
</script>

<style lang="scss" scoped>
.tag-panel {
  position: relative;
}

.tag-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sidebar-text-secondary);
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
  color: var(--sidebar-text);
  transition: background 0.2s;

  &:hover {
    background: var(--sidebar-bg-hover);
  }

  &.active {
    background: var(--sidebar-bg-active);
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
  color: var(--sidebar-text-secondary);
  min-width: 20px;
  text-align: right;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: var(--sidebar-text-secondary);
  font-size: 12px;
}

// 右键菜单
.context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 140px;
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

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
}
</style>

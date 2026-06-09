<template>
  <div class="folder-tree">
    <el-tree
      ref="treeRef"
      :data="folderStore.tree"
      :props="treeProps"
      node-key="id"
      highlight-current
      default-expand-all
      draggable
      :allow-drop="allowDrop"
      :current-node-key="folderStore.currentFolderId"
      @node-click="handleNodeClick"
      @node-contextmenu="handleContextMenu"
      @node-drop="handleNodeDrop"
    >
      <template #default="{ node, data }">
        <FolderTreeNode
          :node="node"
          :data="data"
          :is-current="folderStore.currentFolderId === data.id"
        />
      </template>
    </el-tree>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="handleCreateSubfolder">
        <el-icon><FolderAdd /></el-icon>
        <span>新建子目录</span>
      </div>
      <div class="context-menu-item" @click="handleRename">
        <el-icon><Edit /></el-icon>
        <span>重命名</span>
      </div>
      <div class="context-menu-item danger" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        <span>删除目录</span>
      </div>
    </div>

    <!-- 遮罩层关闭菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu-overlay"
      @click="closeContextMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { FolderAdd, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import type { ElTree } from 'element-plus';
import type { FolderTreeNode } from '../../../shared/types';
import FolderTreeNodeComponent from './FolderTreeNode.vue';
import { useFolderStore } from '../../stores/folder-store';
import { useNoteStore } from '../../stores/note-store';

const folderStore = useFolderStore();
const noteStore = useNoteStore();

const treeRef = ref<InstanceType<typeof ElTree>>();

const treeProps = {
  children: 'children',
  label: 'name',
};

/** 右键菜单状态 */
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeId: '' as string,
});

// ─── 事件处理 ──────────────────────────────────────

/** 点击节点 */
function handleNodeClick(data: FolderTreeNode) {
  folderStore.setCurrentFolder(data.id);
  noteStore.loadByFolder(data.id);
}

/** 右键菜单 */
function handleContextMenu(event: MouseEvent, data: FolderTreeNode) {
  event.preventDefault();
  contextMenu.visible = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.nodeId = data.id;
}

/** 关闭右键菜单 */
function closeContextMenu() {
  contextMenu.visible = false;
}

/** 创建子目录 */
async function handleCreateSubfolder() {
  closeContextMenu();
  const parentId = contextMenu.nodeId;
  try {
    const { value } = await ElMessageBox.prompt('请输入子目录名称', '新建子目录', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '目录名称不能为空',
    });
    await folderStore.createFolder({ name: value, parentId });
    ElMessage.success('子目录已创建');
  } catch {
    // 用户取消
  }
}

/** 重命名 */
async function handleRename() {
  closeContextMenu();
  const nodeId = contextMenu.nodeId;
  const node = folderStore.findNode(nodeId);
  if (!node) return;

  try {
    const { value } = await ElMessageBox.prompt('请输入新名称', '重命名目录', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: node.name,
      inputPattern: /\S+/,
      inputErrorMessage: '目录名称不能为空',
    });
    await folderStore.updateFolder(nodeId, { name: value });
    ElMessage.success('目录已重命名');
  } catch {
    // 用户取消
  }
}

/** 删除目录 */
async function handleDelete() {
  closeContextMenu();
  const nodeId = contextMenu.nodeId;
  const node = folderStore.findNode(nodeId);
  if (!node) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除目录"${node.name}"吗？目录下的笔记将被移至回收站。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    await folderStore.deleteFolder(nodeId);
    ElMessage.success('目录已删除');
  } catch {
    // 用户取消
  }
}

/** 拖拽放置判定 */
function allowDrop(dragging: any, drop: any, type: 'before' | 'after' | 'inner') {
  // 允许放置到节点内部（成为子目录）或前后
  return true;
}

/** 拖拽完成 */
async function handleNodeDrop(dragging: any, drop: any, type: 'before' | 'after' | 'inner') {
  try {
    if (type === 'inner') {
      await folderStore.moveFolder(dragging.data.id, drop.data.id);
    } else {
      await folderStore.moveFolder(dragging.data.id, drop.data.parentId || null);
    }
    ElMessage.success('目录已移动');
  } catch (err) {
    ElMessage.error('移动目录失败');
    await folderStore.loadTree();
  }
}

// ─── 点击外部关闭菜单 ────────────────────────────

function handleOutsideClick(event: MouseEvent) {
  if (contextMenu.visible) {
    closeContextMenu();
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style lang="scss" scoped>
.folder-tree {
  position: relative;
  height: 100%;

  // Element Plus Tree 样式覆盖（深色侧边栏）
  :deep(.el-tree) {
    background: transparent;
    color: var(--sidebar-text);

    .el-tree-node__content {
      height: 36px;

      &:hover {
        background: var(--sidebar-bg-hover);
      }
    }

    .el-tree-node.is-current > .el-tree-node__content {
      background: var(--sidebar-bg-active);
      color: var(--primary-color);
    }

    .el-tree-node__expand-icon {
      color: var(--sidebar-text-secondary);

      &.is-leaf {
        color: transparent;
      }
    }

    // 拖拽提示线
    .el-tree-node__drop-inner {
      border-top-color: var(--primary-color);
    }
  }
}

// 右键菜单
.context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 160px;
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

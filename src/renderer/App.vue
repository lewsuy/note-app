<template>
  <AppLayout />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AppLayout from './components/layout/AppLayout.vue';
import { useFolderStore } from './stores/folder-store';
import { useNoteStore } from './stores/note-store';

const folderStore = useFolderStore();
const noteStore = useNoteStore();

onMounted(async () => {
  // 初始化：加载目录树
  await folderStore.loadTree();
  // 如果有目录，加载第一个目录的笔记
  if (folderStore.tree.length > 0) {
    const firstFolder = folderStore.tree[0];
    await noteStore.loadByFolder(firstFolder.id);
  }
});
</script>

// src/renderer/components/tags/TagInput.vue
// 标签输入组件 - 为笔记添加/移除标签

<template>
  <div class="tag-input">
    <div class="tag-input-tags">
      <el-tag
        v-for="tag in noteTags"
        :key="tag.id"
        :color="tag.color"
        closable
        size="small"
        effect="dark"
        @close="handleRemoveTag(tag.id)"
      >
        {{ tag.name }}
      </el-tag>

      <el-popover
        v-model:visible="showPopover"
        placement="bottom-start"
        :width="220"
        trigger="click"
      >
        <template #reference>
          <el-button size="small" text class="add-tag-btn">
            <el-icon><Plus /></el-icon>
            <span>添加标签</span>
          </el-button>
        </template>

        <div class="tag-popover">
          <el-input
            v-model="searchText"
            placeholder="搜索或创建标签"
            size="small"
            clearable
            @keyup.enter="handleCreateTag"
          />
          <div class="tag-popover-list">
            <div
              v-for="tag in filteredTags"
              :key="tag.id"
              class="tag-popover-item"
              :class="{ disabled: isTagAttached(tag.id) }"
              @click="handleAddTag(tag)"
            >
              <span class="tag-dot" :style="{ background: tag.color }"></span>
              <span class="tag-name">{{ tag.name }}</span>
              <el-icon v-if="isTagAttached(tag.id)" class="check-icon">
                <Check />
              </el-icon>
            </div>
            <div
              v-if="searchText && !filteredTags.some(t => t.name === searchText)"
              class="tag-popover-item create-item"
              @click="handleCreateTag"
            >
              <el-icon><Plus /></el-icon>
              <span>创建 "{{ searchText }}"</span>
            </div>
            <div v-if="filteredTags.length === 0 && !searchText" class="empty-hint">
              暂无可用标签
            </div>
          </div>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Check } from '@element-plus/icons-vue';
import { useTagStore } from '../../stores/tag-store';
import type { Tag, TagWithCount } from '../../../shared/types';
import { TAG_COLORS } from '../../../shared/constants';

const props = defineProps<{
  noteId: string;
  modelTags: string[]; // tag names from note
}>();

const emit = defineEmits<{
  (e: 'tags-changed'): void;
}>();

const tagStore = useTagStore();
const showPopover = ref(false);
const searchText = ref('');
const noteTags = ref<Tag[]>([]);

// 加载笔记标签
watch(
  () => props.noteId,
  async (id) => {
    if (id) {
      await loadNoteTags();
    } else {
      noteTags.value = [];
    }
  },
  { immediate: true }
);

async function loadNoteTags() {
  try {
    const tags = await window.api.noteTag.getTags(props.noteId);
    noteTags.value = tags;
  } catch (err) {
    console.error('获取笔记标签失败:', err);
    noteTags.value = [];
  }
}

const filteredTags = computed(() => {
  if (!searchText.value) return tagStore.tags;
  const keyword = searchText.value.toLowerCase();
  return tagStore.tags.filter(t => t.name.toLowerCase().includes(keyword));
});

function isTagAttached(tagId: string): boolean {
  return noteTags.value.some(t => t.id === tagId);
}

async function handleAddTag(tag: Tag | TagWithCount) {
  if (isTagAttached(tag.id)) return;
  try {
    await window.api.noteTag.addTag(props.noteId, tag.id);
    await loadNoteTags();
    emit('tags-changed');
  } catch (err) {
    console.error('添加标签失败:', err);
  }
}

async function handleRemoveTag(tagId: string) {
  try {
    await window.api.noteTag.removeTag(props.noteId, tagId);
    await loadNoteTags();
    emit('tags-changed');
  } catch (err) {
    console.error('移除标签失败:', err);
  }
}

async function handleCreateTag() {
  if (!searchText.value.trim()) return;
  try {
    const color = TAG_COLORS[tagStore.tags.length % TAG_COLORS.length];
    const tag = await tagStore.createTag({ name: searchText.value.trim(), color });
    if (tag) {
      await handleAddTag(tag);
      searchText.value = '';
    }
  } catch (err) {
    console.error('创建标签失败:', err);
  }
}
</script>

<style lang="scss" scoped>
.tag-input {
  display: flex;
  align-items: center;
}

.tag-input-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.add-tag-btn {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 2px 6px;

  &:hover {
    color: var(--primary-color);
  }
}

.tag-popover {
  max-height: 300px;
}

.tag-popover-list {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.tag-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;

  &:hover {
    background: var(--hover-bg);
  }

  &.disabled {
    opacity: 0.6;
  }

  &.create-item {
    color: var(--primary-color);
    border-top: 1px solid var(--border-light);
    margin-top: 4px;
    padding-top: 8px;
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

.check-icon {
  color: var(--primary-color);
  font-size: 14px;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>

<script setup lang="ts">
import type { UserProfile } from "#shared/types/user";
import { debounce } from "es-toolkit";

const props = defineProps<{
  modelValue: UserProfile[];
  placeholder?: string;
  suggestions?: UserProfile[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: UserProfile[]): void;
}>();

const userStore = useUserStore();

const searchQuery = ref("");
const searchResults = ref<UserProfile[]>([]);
const isSearching = ref(false);
const isOpen = ref(false);

const selectedUsers = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Combine suggestions with search results, avoiding duplicates
const availableUsers = computed(() => {
  const selectedIds = new Set(selectedUsers.value.map((u) => u.id));
  const allUsers = [...(props.suggestions || []), ...searchResults.value];
  const uniqueUsers = new Map<string, UserProfile>();

  for (const user of allUsers) {
    if (!selectedIds.has(user.id) && !uniqueUsers.has(user.id)) {
      uniqueUsers.set(user.id, user);
    }
  }

  return Array.from(uniqueUsers.values());
});

const performSearch = async (query: string) => {
  if (query.length < 2) {
    searchResults.value = [];
    return;
  }

  isSearching.value = true;
  try {
    const results = await userStore.searchUsers(query);
    searchResults.value = results;
  } catch (error) {
    console.error("Search failed:", error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

watch(searchQuery, (newQuery) => {
  debouncedSearch(newQuery);
});

function selectUser(user: UserProfile) {
  if (!selectedUsers.value.some((u) => u.id === user.id)) {
    selectedUsers.value = [...selectedUsers.value, user];
  }
  searchQuery.value = "";
  searchResults.value = [];
}

function removeUser(user: UserProfile) {
  selectedUsers.value = selectedUsers.value.filter((u) => u.id !== user.id);
}

function getUserDisplayName(user: UserProfile): string {
  return user.display_name || user.email || "Unknown User";
}

function getUserInitials(user: UserProfile): string {
  const name = getUserDisplayName(user);
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function handleBlur() {
  setTimeout(() => {
    isOpen.value = false;
  }, 200);
}
</script>

<template>
  <div class="space-y-2">
    <!-- Selected users chips -->
    <div v-if="selectedUsers.length > 0" class="flex flex-wrap gap-2">
      <UBadge
        v-for="user in selectedUsers"
        :key="user.id"
        color="primary"
        variant="subtle"
        class="pr-1"
      >
        <span class="flex items-center gap-1">
          <UAvatar
            v-if="user.avatar_url"
            :src="user.avatar_url"
            :alt="getUserDisplayName(user)"
            size="3xs"
          />
          <span
            v-else
            class="w-4 h-4 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-[10px]"
          >
            {{ getUserInitials(user) }}
          </span>
          {{ getUserDisplayName(user) }}
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-x-mark"
            :padded="false"
            @click="removeUser(user)"
          />
        </span>
      </UBadge>
    </div>

    <!-- Search input with dropdown -->
    <div class="relative">
      <UInput
        v-model="searchQuery"
        :placeholder="placeholder || 'Search users...'"
        icon="i-heroicons-magnifying-glass"
        class="w-full"
        @focus="isOpen = true"
        @blur="handleBlur"
      />

      <!-- Dropdown -->
      <div
        v-if="isOpen && (availableUsers.length > 0 || isSearching)"
        class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        <div v-if="isSearching" class="p-3 text-center text-gray-500">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
          <span class="ml-2">Searching...</span>
        </div>

        <div
          v-for="user in availableUsers"
          :key="user.id"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3"
          @mousedown.prevent="selectUser(user)"
        >
          <UAvatar
            v-if="user.avatar_url"
            :src="user.avatar_url"
            :alt="getUserDisplayName(user)"
            size="sm"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium"
          >
            {{ getUserInitials(user) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ getUserDisplayName(user) }}</p>
            <p v-if="user.email" class="text-xs text-gray-500 truncate">
              {{ user.email }}
            </p>
          </div>
        </div>

        <div
          v-if="!isSearching && searchQuery.length >= 2 && availableUsers.length === 0"
          class="p-3 text-center text-gray-500"
        >
          No users found
        </div>
      </div>
    </div>
  </div>
</template>

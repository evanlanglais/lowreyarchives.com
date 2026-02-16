<script setup lang="ts">
import { ref, computed } from "vue";
import type { UserProfile, GroupWithMembers } from "#shared/types/user";
import type { GroupWrapper } from "#shared/types/group";
import { useUserStore } from "~/stores/user";
import { useEventStore } from "~/stores/event";

const props = defineProps<{
  eventId: number;
  currentTags: string[];
  currentGroups: Array<{ id: number; group_name: string }>;
  currentTaggedUsers: UserProfile[];
  currentSharedUsers: UserProfile[];
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const user = useSupabaseUser();
const userStore = useUserStore();
const eventStore = useEventStore();

const modalOpen = ref(false);
const isSaving = ref(false);
const loadingGroups = ref(false);

// Tags state
const tags = ref<string[]>([]);
const newTag = ref("");

// Sharing state
const userGroups = ref<GroupWrapper[]>([]);
const groupMembers = ref<GroupWithMembers[]>([]);
const selectedGroups = ref<number[]>([]);
const taggedUsers = ref<UserProfile[]>([]);
const sharedWithUsers = ref<UserProfile[]>([]);

const allGroupMembers = computed(() => {
  const uniqueUsers = new Map<string, UserProfile>();
  for (const group of groupMembers.value) {
    for (const member of group.members) {
      if (!uniqueUsers.has(member.id)) {
        uniqueUsers.set(member.id, member);
      }
    }
  }
  return Array.from(uniqueUsers.values());
});

const groupSelectItems = computed(() => {
  return userGroups.value.map((g) => ({
    label: g.group_name,
    value: g.id,
  }));
});

function open() {
  tags.value = [...props.currentTags];
  newTag.value = "";
  selectedGroups.value = props.currentGroups.map((g) => g.id);
  taggedUsers.value = [...props.currentTaggedUsers];
  sharedWithUsers.value = [...props.currentSharedUsers];
  isSaving.value = false;
  modalOpen.value = true;
  loadGroupsData();
}

function addTag() {
  const tag = newTag.value.trim();
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag);
  }
  newTag.value = "";
}

function removeTag(index: number) {
  tags.value.splice(index, 1);
}

function handleTagKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    addTag();
  }
}

async function loadGroupsData() {
  if (!user.value || loadingGroups.value) return;
  loadingGroups.value = true;
  try {
    const [groups, membersData] = await Promise.all([
      userStore.getUserGroups(user.value.sub),
      userStore.getGroupMembers(),
    ]);
    userGroups.value = groups;
    groupMembers.value = membersData.groups;
  } catch (e) {
    console.error("Failed to load groups", e);
  } finally {
    loadingGroups.value = false;
  }
}

async function save() {
  isSaving.value = true;
  try {
    await Promise.all([
      $fetch(`/api/events/${props.eventId}/tags`, {
        method: "PUT",
        body: { tags: tags.value },
      }),
      $fetch(`/api/events/${props.eventId}/sharing`, {
        method: "PUT",
        body: {
          groupIds: selectedGroups.value,
          taggedUserIds: taggedUsers.value.map((u) => u.id),
          sharedUserIds: sharedWithUsers.value.map((u) => u.id),
        },
      }),
    ]);
    eventStore.invalidateCache("getEventDetails", props.eventId);
    eventStore.invalidateCache("getEvent", props.eventId);
    userStore.invalidateCacheAll("getUserEvents");
    modalOpen.value = false;
    emit("updated");
  } catch (error) {
    console.error("Failed to save event details:", error);
  } finally {
    isSaving.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Edit Event Details"
  >
    <template #default />

    <template #body>
      <div class="space-y-6">
        <!-- Tags -->
        <UFormField label="Tags">
          <div class="space-y-2">
            <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
              <UBadge
                v-for="(tag, index) in tags"
                :key="tag"
                color="neutral"
                variant="subtle"
                class="pr-1"
              >
                <span class="flex items-center gap-1">
                  {{ tag }}
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-mark"
                    :padded="false"
                    @click="removeTag(index)"
                  />
                </span>
              </UBadge>
            </div>
            <div class="flex gap-2">
              <UInput
                v-model="newTag"
                placeholder="Add a tag..."
                class="flex-1"
                @keydown="handleTagKeydown"
              />
              <UButton
                label="Add"
                icon="i-heroicons-plus"
                color="neutral"
                variant="outline"
                :disabled="!newTag.trim()"
                @click="addTag"
              />
            </div>
          </div>
        </UFormField>

        <USeparator />

        <!-- Groups -->
        <UFormField
          label="Share with Groups"
          description="Select groups that can view this event"
        >
          <div v-if="loadingGroups" class="py-2">
            <UIcon
              name="i-heroicons-arrow-path"
              class="animate-spin text-(--ui-text-muted)"
            />
            <span class="ml-2 text-(--ui-text-muted)">
              Loading groups...
            </span>
          </div>
          <div
            v-else-if="groupSelectItems.length > 0"
            class="space-y-2"
          >
            <div
              v-for="group in groupSelectItems"
              :key="group.value"
              class="flex items-center gap-2"
            >
              <UCheckbox
                :model-value="selectedGroups.includes(group.value)"
                @update:model-value="
                  (checked: boolean | 'indeterminate') => {
                    if (checked === true) {
                      selectedGroups.push(group.value);
                    } else {
                      selectedGroups = selectedGroups.filter(
                        (id) => id !== group.value,
                      );
                    }
                  }
                "
              />
              <span>{{ group.label }}</span>
            </div>
          </div>
          <p v-else class="text-(--ui-text-muted) text-sm">
            No groups available
          </p>
        </UFormField>

        <!-- Tagged users -->
        <UFormField
          label="Tag Participants"
          description="Tag people who were part of this event"
        >
          <UserSelectMenu
            v-model="taggedUsers"
            placeholder="Search for participants..."
            :suggestions="allGroupMembers"
          />
        </UFormField>

        <!-- Shared users -->
        <UFormField
          label="Share with Specific Users"
          description="Give access to individual users"
        >
          <UserSelectMenu
            v-model="sharedWithUsers"
            placeholder="Search for users to share with..."
            :suggestions="allGroupMembers"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="modalOpen = false"
        />
        <UButton
          label="Save"
          color="primary"
          :loading="isSaving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

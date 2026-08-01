<template>
    <el-dropdown trigger="click" @command="handleCommand">
        <el-button size="small" class="theme-toggle-button">
            <el-icon>
                <moon v-if="resolvedTheme === 'dark'" />
                <sunny v-else />
            </el-icon>
            <span>{{ displayLabel }}</span>
            <el-icon class="theme-toggle-arrow"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
            <el-dropdown-menu>
                <el-dropdown-item
                    v-for="option in themeOptions"
                    :key="option.value"
                    :command="option.value"
                    :class="{ 'is-active-theme': themePreference === option.value }"
                >
                    <el-icon>
                        <monitor v-if="option.value === 'auto'" />
                        <sunny v-else-if="option.value === 'light'" />
                        <moon v-else />
                    </el-icon>
                    <span>{{ option.label }}</span>
                </el-dropdown-item>
            </el-dropdown-menu>
        </template>
    </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Monitor, Moon, Sunny } from '@element-plus/icons-vue'
import { setThemePreference, useTheme, type ThemePreference } from '../composables/useTheme'

const { themePreference, resolvedTheme } = useTheme()

const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'auto', label: '自动' },
    { value: 'light', label: '白天' },
    { value: 'dark', label: '夜晚' },
]

const resolvedThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? '夜晚' : '白天'))

const displayLabel = computed(() => {
    if (themePreference.value === 'auto') {
        return `自动 · ${resolvedThemeLabel.value}`
    }
    return resolvedThemeLabel.value
})

function isThemePreference(value: string): value is ThemePreference {
    return value === 'auto' || value === 'light' || value === 'dark'
}

function handleCommand(command: string | number | object) {
    if (typeof command === 'string' && isThemePreference(command)) {
        setThemePreference(command)
    }
}
</script>

<style scoped>
.theme-toggle-button {
    gap: 0.25rem;
}

.theme-toggle-arrow {
    margin-left: 0.125rem;
}

:global(.el-dropdown-menu__item.is-active-theme) {
    color: var(--el-color-primary);
    font-weight: 600;
}
</style>

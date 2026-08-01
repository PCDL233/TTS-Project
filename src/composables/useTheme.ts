import { computed, ref } from 'vue'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'mimo_theme_preference'
const DAY_START_HOUR = 6
const NIGHT_START_HOUR = 18

const themePreference = ref<ThemePreference>(readStoredPreference())
const timeTheme = ref<ResolvedTheme>(resolveThemeByTime())
const resolvedTheme = computed<ResolvedTheme>(() => {
  if (themePreference.value === 'auto') {
    return timeTheme.value
  }
  return themePreference.value
})

let initialized = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

function resolveThemeByTime(now = new Date()): ResolvedTheme {
  const hour = now.getHours()
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'light' : 'dark'
}

function getMsUntilNextBoundary(now = new Date()): number {
  const next = new Date(now)
  const hour = now.getHours()

  if (hour < DAY_START_HOUR) {
    next.setHours(DAY_START_HOUR, 0, 0, 0)
  } else if (hour < NIGHT_START_HOUR) {
    next.setHours(NIGHT_START_HOUR, 0, 0, 0)
  } else {
    next.setDate(next.getDate() + 1)
    next.setHours(DAY_START_HOUR, 0, 0, 0)
  }

  return Math.max(next.getTime() - now.getTime(), 1000)
}

function applyThemeToDocument() {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const isDark = resolvedTheme.value === 'dark'
  root.classList.toggle('dark', isDark)
  root.dataset.theme = resolvedTheme.value
  root.style.colorScheme = resolvedTheme.value
}

function refreshTimeTheme() {
  timeTheme.value = resolveThemeByTime()
  applyThemeToDocument()
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleAutoRefresh() {
  clearRefreshTimer()

  if (typeof window === 'undefined' || themePreference.value !== 'auto') {
    return
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimeTheme()
    scheduleAutoRefresh()
  }, getMsUntilNextBoundary())
}

function persistThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // 存储不可用时仅保持当前页面内主题状态
  }
}

export function initializeTheme() {
  if (initialized) {
    applyThemeToDocument()
    return
  }

  initialized = true
  themePreference.value = readStoredPreference()
  refreshTimeTheme()
  scheduleAutoRefresh()

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshTimeTheme()
        scheduleAutoRefresh()
      }
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }

      themePreference.value = isThemePreference(event.newValue) ? event.newValue : 'auto'
      refreshTimeTheme()
      scheduleAutoRefresh()
    })
  }
}

export function setThemePreference(preference: ThemePreference) {
  themePreference.value = preference
  persistThemePreference(preference)
  refreshTimeTheme()
  scheduleAutoRefresh()
}

export function toggleResolvedTheme() {
  setThemePreference(resolvedTheme.value === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  initializeTheme()

  return {
    themePreference,
    resolvedTheme,
    setThemePreference,
    toggleResolvedTheme,
  }
}

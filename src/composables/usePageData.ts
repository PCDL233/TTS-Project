import { ref, type Ref } from 'vue'

export interface UsePageDataOptions<T> {
  immediate?: boolean
  initialData?: T
  onError?: (err: any) => void
  defaultErrorMessage?: string
}

export function usePageData<T, Args extends any[] = []>(
  fetcher: (...args: Args) => Promise<T>,
  options: UsePageDataOptions<T> = {},
) {
  const {
    immediate = false,
    initialData,
    onError,
    defaultErrorMessage = '加载失败',
  } = options

  const data = ref<T | undefined>(initialData) as Ref<T | undefined>
  const loading = ref(false)
  const error = ref('')

  async function refresh(...args: Args): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      data.value = await fetcher(...args)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || defaultErrorMessage
      error.value = msg
      onError?.(err)
    } finally {
      loading.value = false
    }
  }

  if (immediate) {
    refresh(...([] as unknown as Args))
  }

  return { data, loading, error, refresh }
}

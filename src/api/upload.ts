import { client } from './client'

async function uploadFormData<T>(url: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)
  return client.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data)
}

export function uploadAvatar(file: File): Promise<{ url: string; filename: string }> {
  return uploadFormData('/upload/avatar', file)
}

export function uploadFile(file: File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
  return uploadFormData('/upload/file', file)
}

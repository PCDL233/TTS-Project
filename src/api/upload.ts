import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function uploadAvatar(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')

  return axios
    .post(`${BACKEND_URL}/api/upload/avatar`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => res.data)
}

export function uploadFile(file: File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')

  return axios
    .post(`${BACKEND_URL}/api/upload/file`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => res.data)
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

export const proxyImage = async (imageUrl) => {
  const res = await fetch(`${API_BASE_URL}/api/image-proxy/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ url: imageUrl })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || '이미지 프록시 실패')
  }
  const data = await res.json()
  // data.url은 '/uploads/...' 형태
  return {
    relativePath: data.relative_path,
    url: `${API_BASE_URL}${data.url}`
  }
}



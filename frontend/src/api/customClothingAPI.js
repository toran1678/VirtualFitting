import axios from "axios"

const API_BASE_URL = process.env.REACT_APP_API_URL || ""

// axios 인스턴스 생성
const customClothingAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/custom-clothing`,
  withCredentials: true, // 세션 쿠키 전송
  timeout: 30000,
})

// API 에러 처리
const handleApiError = (error) => {
  if (error.response?.status === 401 || error.message.includes("401")) {
    alert("로그인이 필요합니다.")
    window.location.href = "/login"
    return new Error("로그인이 필요합니다.")
  }
  return error
}

// 요청 인터셉터
customClothingAPI.interceptors.request.use(
  (config) => {
    console.log(`📤 CustomClothing API 요청: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    return config
  },
  (error) => {
    console.error("📤 요청 오류:", error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
customClothingAPI.interceptors.response.use(
  (response) => {
    console.log(`📥 CustomClothing API 응답: ${response.status}`, response.data)
    return response
  },
  (error) => {
    console.error("📥 응답 오류:", error)
    return Promise.reject(handleApiError(error))
  },
)

// 커스터마이징 의류 생성
export const createCustomClothing = async (customName, imageFile) => {
  const formData = new FormData()
  formData.append('custom_name', customName)
  formData.append('image', imageFile)

  const response = await customClothingAPI.post('/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 사용자의 커스터마이징 의류 목록 조회
export const getMyCustomClothes = async (page = 1, perPage = 20) => {
  const response = await customClothingAPI.get(`/?page=${page}&per_page=${perPage}`)
  return response.data
}

// 특정 커스터마이징 의류 조회
export const getCustomClothingById = async (customClothingId) => {
  const response = await customClothingAPI.get(`/${customClothingId}`)
  return response.data
}

// 커스터마이징 의류 정보 수정
export const updateCustomClothing = async (customClothingId, customName) => {
  const response = await customClothingAPI.put(`/${customClothingId}`, {
    custom_name: customName
  })
  return response.data
}

// 커스터마이징 의류 삭제
export const deleteCustomClothing = async (customClothingId) => {
  const response = await customClothingAPI.delete(`/${customClothingId}`)
  // 204 No Content 응답이므로 성공 여부만 반환
  return { success: true, message: '커스텀 의류가 삭제되었습니다.' }
}

// 커스터마이징 의류 일괄 삭제
export const bulkDeleteCustomClothes = async (customClothingIds) => {
  const response = await customClothingAPI.delete('/', {
    data: customClothingIds
  })
  return response.data
}

// 커스터마이징 의류 개수 조회
export const getCustomClothesCount = async () => {
  const response = await customClothingAPI.get('/stats/count')
  return response.data
}

// 커스터마이징 의류 이미지 URL 생성
export const getCustomClothingImageUrl = (imageUrl) => {
  if (!imageUrl) return '/placeholder.svg'
  
  // 이미 절대 URL인 경우
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  
  // 상대 경로인 경우 API 서버 URL과 결합
  return `${API_BASE_URL}/${imageUrl}`
}

import axios from "axios"

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// Axios 인스턴스 생성
const clothingAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/clothing`,
  timeout: 10000,
})

// 요청 인터셉터 (인증 토큰 추가)
clothingAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 응답 인터셉터 (에러 처리)
clothingAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API 오류:", error)
    return Promise.reject(error)
  },
)

/**
 * 의류 아이템 목록 조회
 */
export const getClothingItems = async (params = {}) => {
  try {
    const { page = 1, size = 20, sort_by = "likes", order = "desc", category = null, gender = null } = params

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort_by,
      order,
    })

    if (category) queryParams.append("category", category)
    if (gender) queryParams.append("gender", gender)

    const response = await clothingAPI.get(`/?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("의류 아이템 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 인기 상품 조회
 */
export const getPopularItems = async (limit = 6) => {
  try {
    const response = await clothingAPI.get(`/popular?limit=${limit}`)
    return response.data
  } catch (error) {
    console.error("인기 상품 조회 실패:", error)
    throw error
  }
}

/**
 * 최신 상품 조회
 */
export const getLatestItems = async (limit = 6) => {
  try {
    const response = await clothingAPI.get(`/latest?limit=${limit}`)
    return response.data
  } catch (error) {
    console.error("최신 상품 조회 실패:", error)
    throw error
  }
}

/**
 * 상품 검색
 */
export const searchClothingItems = async (query, page = 1, size = 20) => {
  try {
    const response = await clothingAPI.get(`/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`)
    return response.data
  } catch (error) {
    console.error("상품 검색 실패:", error)
    throw error
  }
}

/**
 * 특정 상품 조회
 */
export const getClothingItem = async (productId) => {
  try {
    const response = await clothingAPI.get(`/${productId}`)
    return response.data
  } catch (error) {
    console.error("상품 조회 실패:", error)
    throw error
  }
}

/**
 * 카테고리별 상품 조회 (편의 함수)
 */
export const getClothingItemsByCategory = async (category, params = {}) => {
  return getClothingItems({ ...params, category })
}

/**
 * 성별별 상품 조회 (편의 함수)
 */
export const getClothingItemsByGender = async (gender, params = {}) => {
  return getClothingItems({ ...params, gender })
}

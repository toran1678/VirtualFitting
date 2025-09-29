/**
 * ===================================================================
 * 의류 아이템 관리 API
 * ===================================================================
 *
 * 주요 기능:
 * - 의류 아이템 목록 조회 (페이지네이션, 정렬, 필터링)
 * - 인기/최신 상품 조회
 * - 의류 검색 기능
 * - 카테고리별/성별 상품 분류
 * - 브랜드별 상품 필터링
 * - 고급 브라우징 (다중 필터 조합)
 *
 * 기술 스택:
 * - HTTP Client: Axios
 * - 인증: Bearer Token (localStorage)
 *
 * 사용 예시:
 * - 메인 페이지 상품 진열
 * - 가상 피팅을 위한 의류 선택
 * - 카테고리별 상품 브라우징
 * - 검색 결과 페이지
 * - 상품 상세 페이지
 * - 좋아요 기능과 연동
 *
 * 지원 필터:
 * - 메인 카테고리 (상의, 하의, 아우터 등)
 * - 서브 카테고리 (티셔츠, 청바지 등)
 * - 성별 (남성, 여성, 유니섹스)
 * - 브랜드
 * - 정렬 (인기순, 최신순, 가격순)
 * ===================================================================
 */

import axios from "axios"

const API_BASE_URL = process.env.REACT_APP_API_URL || ""

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
 * 카테고리 정보 조회
 */
export const getCategories = async () => {
  try {
    const response = await clothingAPI.get("/categories")
    return response.data
  } catch (error) {
    console.error("카테고리 조회 실패:", error)
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

/**
 * 필터링과 검색이 가능한 의류 아이템 브라우징
 */
export const browseClothingItems = async (params = {}) => {
  try {
    const {
      page = 1,
      size = 20,
      sort_by = "likes",
      order = "desc",
      main_category = null,
      sub_category = null,
      gender = null,
      brand = null,
      search = null,
    } = params

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort_by,
      order,
    })

    if (main_category) queryParams.append("main_category", main_category)
    if (sub_category) queryParams.append("sub_category", sub_category)
    if (gender) queryParams.append("gender", gender)
    if (brand) queryParams.append("brand", brand)
    if (search) queryParams.append("search", search)

    const response = await clothingAPI.get(`/browse?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("상품 브라우징 실패:", error)
    throw error
  }
}
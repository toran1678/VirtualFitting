import axios from "axios"
import { retryApiCall } from "./apiUtils"
// 새로운 팔로우 시스템 import
import {
  toggleUserFollowEnhanced,
  getUserFollowersEnhanced,
  getUserFollowingEnhanced,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest,
} from "./followSystem"

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// axios 인스턴스 생성
const userProfileAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/users/profile`,
  withCredentials: true, // 세션 쿠키 전송
  timeout: 30000, // 10초에서 30초로 늘림
})

// 요청 인터셉터
userProfileAPI.interceptors.request.use(
  (config) => {
    console.log(`📤 UserProfile API 요청: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    return config
  },
  (error) => {
    console.error("📤 요청 오류:", error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
userProfileAPI.interceptors.response.use(
  (response) => {
    console.log(
      `📥 UserProfile API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`,
      response.data,
    )
    return response
  },
  (error) => {
    console.error("📥 응답 오류:", error)

    // 상세한 오류 정보 로깅
    if (error.response) {
      console.error("응답 상태:", error.response.status)
      console.error("응답 데이터:", error.response.data)
    }

    return Promise.reject(error)
  },
)

/**
 * 이메일로 사용자 프로필 조회
 * @param {string} email - 사용자 이메일
 * @returns {Promise<Object>} - 사용자 프로필 정보
 */
export const getUserProfileByEmail = async (email) => {
  try {
    return await retryApiCall(async () => {
      const response = await userProfileAPI.get(`/${email}`)
      return response.data
    })
  } catch (error) {
    console.error("사용자 프로필 조회 실패:", error)
    throw error
  }
}

/**
 * 특정 사용자의 피드 목록 조회
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} - 피드 목록과 페이지네이션 정보
 */
export const getUserFeeds = async (email, params = {}) => {
  try {
    const { page = 1, size = 20 } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    return await retryApiCall(async () => {
      const response = await userProfileAPI.get(`/${email}/feeds?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("사용자 피드 조회 실패:", error)
    throw error
  }
}

/**
 * 특정 사용자의 좋아요한 의류 목록 조회
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 좋아요한 의류 목록
 */
export const getUserLikedClothes = async (email, params = {}) => {
  try {
    const { skip = 0, limit = 100 } = params
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    return await retryApiCall(async () => {
      const response = await userProfileAPI.get(`/${email}/liked-clothes?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("사용자 좋아요 의류 조회 실패:", error)
    throw error
  }
}

// 새로운 팔로우 시스템 함수들을 export (향상된 기능)
export const toggleUserFollow = toggleUserFollowEnhanced
export const getUserFollowers = getUserFollowersEnhanced
export const getUserFollowing = getUserFollowingEnhanced

// 팔로우 요청 관련 함수들 export
export { getFollowRequests, acceptFollowRequest, rejectFollowRequest, cancelFollowRequest }

/**
 * 특정 사용자의 가상 피팅 목록 조회 (추후 구현)
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 가상 피팅 목록
 */
export const getUserVirtualFittings = async (email, params = {}) => {
  // 임시로 빈 배열 반환 (백엔드 구현 후 수정)
  return []
}

/**
 * 특정 사용자의 커스텀 의류 목록 조회 (추후 구현)
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 커스텀 의류 목록
 */
export const getUserCustomClothes = async (email, params = {}) => {
  // 임시로 빈 배열 반환 (백엔드 구현 후 수정)
  return []
}

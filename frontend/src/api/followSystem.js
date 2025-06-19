/**
 * ===================================================================
 * 사용자 팔로우 시스템 API
 * ===================================================================
 *
 * 주요 기능:
 * - 사용자 팔로우/언팔로우 (공개/비공개 계정 지원)
 * - 팔로워/팔로잉 목록 조회
 * - 팔로우 요청 관리 (요청/수락/거절/취소)
 * - 비공개 계정 팔로우 요청 처리
 *
 * 기술 스택:
 * - HTTP Client: Axios
 * - 인증: 세션 쿠키 기반
 * - 재시도 로직: apiUtils.retryApiCall 사용
 *
 * 사용 예시:
 * - 사용자 프로필에서 팔로우 버튼 클릭
 * - 팔로워/팔로잉 목록 페이지
 * - 팔로우 요청 알림 및 관리
 * - 소셜 피드 구성을 위한 팔로잉 관계 확인
 * ===================================================================
 */

import axios from "axios"
import { retryApiCall } from "./apiUtils"

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// axios 인스턴스 생성 - 새 prefix 사용
const followAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/follow`,
  withCredentials: true,
  timeout: 30000,
})

// 요청 인터셉터
followAPI.interceptors.request.use(
  (config) => {
    console.log(`📤 Follow API 요청: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    return config
  },
  (error) => {
    console.error("📤 Follow API 요청 오류:", error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
followAPI.interceptors.response.use(
  (response) => {
    console.log(`📥 Follow API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    return response
  },
  (error) => {
    console.error("📥 Follow API 응답 오류:", error)

    if (error.response) {
      console.error("응답 상태:", error.response.status)
      console.error("응답 데이터:", error.response.data)
    }

    return Promise.reject(error)
  },
)

/**
 * 향상된 팔로우/언팔로우 토글 (비공개 계정 고려)
 * @param {string} email - 대상 사용자 이메일
 * @returns {Promise<Object>} - 팔로우 상태 정보
 */
export const toggleUserFollowEnhanced = async (email) => {
  try {
    return await retryApiCall(async () => {
      const response = await followAPI.post(`/${email}/follow`)
      return response.data
    })
  } catch (error) {
    console.error("향상된 팔로우 토글 실패:", error)
    throw error
  }
}

/**
 * 사용자의 팔로워 목록 조회 (팔로우 상태 포함)
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 팔로워 목록
 */
export const getUserFollowersEnhanced = async (email, params = {}) => {
  try {
    const { skip = 0, limit = 100 } = params
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    return await retryApiCall(async () => {
      const response = await followAPI.get(`/${email}/followers?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("향상된 팔로워 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 사용자의 팔로잉 목록 조회 (팔로우 상태 포함)
 * @param {string} email - 사용자 이메일
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 팔로잉 목록
 */
export const getUserFollowingEnhanced = async (email, params = {}) => {
  try {
    const { skip = 0, limit = 100 } = params
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    return await retryApiCall(async () => {
      const response = await followAPI.get(`/${email}/following?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("향상된 팔로잉 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 받은 팔로우 요청 목록 조회
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 팔로우 요청 목록
 */
export const getFollowRequests = async (params = {}) => {
  try {
    const { skip = 0, limit = 100 } = params
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    return await retryApiCall(async () => {
      const response = await followAPI.get(`/requests?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("팔로우 요청 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 보낸 팔로우 요청 목록 조회
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Array>} - 보낸 팔로우 요청 목록
 */
export const getSentFollowRequests = async (params = {}) => {
  try {
    const { skip = 0, limit = 100 } = params
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    return await retryApiCall(async () => {
      const response = await followAPI.get(`/requests/sent?${queryParams}`)
      return response.data
    })
  } catch (error) {
    console.error("보낸 팔로우 요청 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 팔로우 요청 수락
 * @param {number} requestId - 요청 ID
 * @returns {Promise<Object>} - 응답 데이터
 */
export const acceptFollowRequest = async (requestId) => {
  try {
    const response = await followAPI.post(`/requests/${requestId}/accept`)
    return response.data
  } catch (error) {
    console.error("팔로우 요청 수락 실패:", error)
    throw error
  }
}

/**
 * 팔로우 요청 거절
 * @param {number} requestId - 요청 ID
 * @returns {Promise<Object>} - 응답 데이터
 */
export const rejectFollowRequest = async (requestId) => {
  try {
    const response = await followAPI.post(`/requests/${requestId}/reject`)
    return response.data
  } catch (error) {
    console.error("팔로우 요청 거절 실패:", error)
    throw error
  }
}

/**
 * 팔로우 요청 취소
 * @param {string} targetEmail - 대상 사용자 이메일
 * @returns {Promise<Object>} - 응답 데이터
 */
export const cancelFollowRequestEnhanced = async (targetEmail) => {
  try {
    const response = await followAPI.delete(`/requests/${targetEmail}/cancel`)
    return response.data
  } catch (error) {
    console.error("팔로우 요청 취소 실패:", error)
    throw error
  }
}

// 기존 API와의 호환성을 위한 래퍼 함수들
export const toggleUserFollow = toggleUserFollowEnhanced
export const getUserFollowers = getUserFollowersEnhanced
export const getUserFollowing = getUserFollowingEnhanced
export const cancelFollowRequest = cancelFollowRequestEnhanced

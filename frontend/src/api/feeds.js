/**
 * ===================================================================
 * 소셜 피드 관리 API
 * ===================================================================
 *
 * 주요 기능:
 * - 피드 작성/수정/삭제 (이미지 업로드 지원)
 * - 피드 목록 조회 및 페이지네이션
 * - 피드 좋아요 토글
 * - 피드 댓글 시스템 (댓글/대댓글)
 * - 내가 작성한 피드 조회
 * - 피드 검색 기능
 *
 * 기술 스택:
 * - HTTP Client: Axios
 * - 파일 업로드: FormData (multipart/form-data)
 * - 인증: 세션 쿠키 기반
 *
 * 사용 예시:
 * - 메인 피드 페이지에서 게시물 목록 표시
 * - 가상 피팅 결과를 피드로 공유
 * - 의류 코디네이션 팁 공유
 * - 사용자 간 소셜 인터랙션 (좋아요, 댓글)
 * - 마이페이지에서 내 게시물 관리
 *
 * 이미지 처리:
 * - 다중 이미지 업로드 지원
 * - 이미지 순서 관리
 * - FormData를 통한 파일 전송
 * ===================================================================
 */

import axios from "axios"

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// axios 인스턴스 생성
const feedAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/feeds`,
  withCredentials: true, // 세션 쿠키 전송
  timeout: 30000, // 파일 업로드를 위해 타임아웃 증가
})

// 요청 인터셉터
feedAPI.interceptors.request.use(
  (config) => {
    console.log(`📤 API 요청: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    return config
  },
  (error) => {
    console.error("📤 요청 오류:", error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
feedAPI.interceptors.response.use(
  (response) => {
    console.log(`📥 API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    return response
  },
  (error) => {
    console.error("📥 응답 오류:", error)

    // 상세한 오류 정보 로깅
    if (error.response) {
      console.error("응답 상태:", error.response.status)
      console.error("응답 데이터:", error.response.data)
      console.error("응답 헤더:", error.response.headers)
    } else if (error.request) {
      console.error("요청 오류:", error.request)
    } else {
      console.error("설정 오류:", error.message)
    }

    // 인증 오류 처리
    if (error.response?.status === 401) {
      console.error("인증이 필요합니다. 로그인 페이지로 이동해주세요.")
    }

    return Promise.reject(error)
  },
)

/**
 * 피드 작성
 * @param {Object} feedData - 피드 데이터 (title, content)
 * @param {Array} imageFiles - 이미지 파일 배열
 * @returns {Promise<Object>} - 생성된 피드 정보
 */
export const createFeed = async (feedData, imageFiles = []) => {
  try {
    // FormData 생성
    const formData = new FormData()
    formData.append("title", feedData.title)
    formData.append("content", feedData.content)

    // 이미지 파일과 순서 정보 추가
    imageFiles.forEach((image, index) => {
      if (image.file) {
        formData.append("images", image.file)
        formData.append("image_orders", image.order || index + 1)
      }
    })

    const response = await feedAPI.post("/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data
  } catch (error) {
    console.error("피드 작성 실패:", error)
    throw error
  }
}

/**
 * 피드 목록 조회
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} - 피드 목록과 페이지네이션 정보
 */
export const getFeeds = async (params = {}) => {
  try {
    const { page = 1, size = 10, sort_by = "created_at", order = "desc" } = params

    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort_by,
      order,
    })

    const response = await feedAPI.get(`/?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("피드 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 특정 피드 조회
 * @param {number} feedId - 피드 ID
 * @returns {Promise<Object>} - 피드 정보
 */
export const getFeedById = async (feedId) => {
  try {
    const response = await feedAPI.get(`/${feedId}`)
    return response.data
  } catch (error) {
    console.error("Feed lookup failed:", error)
    throw error
  }
}

/**
 * 피드 수정
 * @param {number} feedId - 피드 ID
 * @param {Object} feedData - 수정할 피드 데이터
 * @param {Array} imageFiles - 새로운 이미지 파일 배열
 * @returns {Promise<Object>} - 수정된 피드 정보
 */
export const updateFeed = async (feedId, feedData, imageFiles = [], existingImageIds = '') => {
  try {
    const formData = new FormData()
    formData.append("title", feedData.title)
    formData.append("content", feedData.content)

    // 유지할 기존 이미지 ID들 추가
    if (existingImageIds) {
      formData.append("existing_image_ids", existingImageIds)
    }

    // 이미지 파일과 순서 정보 추가
    imageFiles.forEach((image, index) => {
      if (image.file) {
        formData.append("images", image.file)
        formData.append("image_orders", image.order || index + 1)
      }
    })

    const response = await feedAPI.put(`/${feedId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data
  } catch (error) {
    console.error("피드 수정 실패:", error)
    throw error
  }
}

/**
 * 피드 삭제
 * @param {number} feedId - 피드 ID
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteFeed = async (feedId) => {
  try {
    const response = await feedAPI.delete(`/${feedId}`)
    return response.data
  } catch (error) {
    console.error("피드 삭제 실패:", error)
    throw error
  }
}

/**
 * 피드 좋아요 토글
 * @param {number} feedId - 피드 ID
 * @returns {Promise<Object>} - 좋아요 상태 정보
 */
export const toggleFeedLike = async (feedId) => {
  try {
    const response = await feedAPI.post(`/${feedId}/like`)
    return response.data
  } catch (error) {
    console.error("피드 좋아요 토글 실패:", error)
    throw error
  }
}

/**
 * 피드 댓글 목록 조회
 * @param {number} feedId - 피드 ID
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} - 댓글 목록
 */
export const getFeedComments = async (feedId, params = {}) => {
  try {
    const { page = 1, size = 20, tree_structure = true } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      tree_structure: tree_structure.toString(),
    })

    // 경로 끝에 슬래시 추가
    const response = await feedAPI.get(`/${feedId}/comments/?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("피드 댓글 조회 실패:", error)
    throw error
  }
}

/**
 * 피드 댓글 작성
 * @param {number} feedId - 피드 ID
 * @param {string} content - 댓글 내용
 * @param {number|null} parentId - 부모 댓글 ID (대댓글인 경우)
 * @returns {Promise<Object>} - 생성된 댓글 정보
 */
export const createFeedComment = async (feedId, content, parentId = null) => {
  try {
    console.log(`💬 댓글 작성 API 호출: feedId=${feedId}, content="${content}", parentId=${parentId}`)

    const requestData = {
      content: content.trim(),
    }

    // parentId가 유효한 값인 경우에만 추가
    if (parentId && parentId > 0) {
      requestData.parent_id = parentId
    }

    console.log(`📤 요청 데이터:`, requestData)

    // 경로 끝에 슬래시 추가
    const response = await feedAPI.post(`/${feedId}/comments/`, requestData, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log(`✅ 댓글 작성 성공:`, response.data)
    return response.data
  } catch (error) {
    console.error("피드 댓글 작성 실패:", error)

    // 더 상세한 오류 정보 로깅
    if (error.response?.data) {
      console.error("서버 오류 응답:", error.response.data)
    }

    throw error
  }
}

/**
 * 피드 댓글 수정
 * @param {number} feedId - 피드 ID
 * @param {number} commentId - 댓글 ID
 * @param {string} content - 수정할 댓글 내용
 * @returns {Promise<Object>} - 수정된 댓글 정보
 */
export const updateFeedComment = async (feedId, commentId, content) => {
  try {
    // 경로 끝에 슬래시 추가
    const response = await feedAPI.put(
      `/${feedId}/comments/${commentId}/`,
      {
        content: content.trim(),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    return response.data
  } catch (error) {
    console.error("피드 댓글 수정 실패:", error)
    throw error
  }
}

/**
 * 피드 댓글 삭제
 * @param {number} feedId - 피드 ID
 * @param {number} commentId - 댓글 ID
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteFeedComment = async (feedId, commentId) => {
  try {
    // 경로 끝에 슬래시 추가
    const response = await feedAPI.delete(`/${feedId}/comments/${commentId}/`)
    return response.data
  } catch (error) {
    console.error("피드 댓글 삭제 실패:", error)
    throw error
  }
}

/**
 * 특정 댓글 조회
 * @param {number} feedId - 피드 ID
 * @param {number} commentId - 댓글 ID
 * @returns {Promise<Object>} - 댓글 정보
 */
export const getFeedComment = async (feedId, commentId) => {
  try {
    // 경로 끝에 슬래시 추가
    const response = await feedAPI.get(`/${feedId}/comments/${commentId}/`)
    return response.data
  } catch (error) {
    console.error("피드 댓글 조회 실패:", error)
    throw error
  }
}

/**
 * 댓글의 대댓글 목록 조회
 * @param {number} feedId - 피드 ID
 * @param {number} commentId - 부모 댓글 ID
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} - 대댓글 목록
 */
export const getCommentReplies = async (feedId, commentId, params = {}) => {
  try {
    const { page = 1, size = 50 } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    // 경로 끝에 슬래시 추가
    const response = await feedAPI.get(`/${feedId}/comments/${commentId}/replies/?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("대댓글 목록 조회 실패:", error)
    throw error
  }
}

/**
 * 내가 작성한 피드 목록 조회
 * @param {Object} params - 조회 파라미터
 * @returns {Promise<Object>} - 내 피드 목록
 */
export const getMyFeeds = async (params = {}) => {
  try {
    const { page = 1, size = 10 } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    console.log("📤 getMyFeeds 요청:", {
      url: `/my-feeds?${queryParams}`,
      params,
    })

    const response = await feedAPI.get(`/my-feeds?${queryParams}`)

    console.log("📥 getMyFeeds 응답:", response.data)
    return response.data
  } catch (error) {
    console.error("❌ 내 피드 목록 조회 실패:", error)

    // 더 상세한 에러 정보
    if (error.response) {
      console.error("에러 상태:", error.response.status)
      console.error("에러 데이터:", error.response.data)
      console.error("에러 헤더:", error.response.headers)
    }

    throw error
  }
}

/**
 * 피드 검색
 * @param {string} query - 검색어
 * @param {Object} params - 검색 파라미터
 * @returns {Promise<Object>} - 검색 결과
 */
export const searchFeeds = async (query, params = {}) => {
  try {
    const { page = 1, size = 10 } = params
    const queryParams = new URLSearchParams({
      q: query,
      page: page.toString(),
      size: size.toString(),
    })

    const response = await feedAPI.get(`/search?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("피드 검색 실패:", error)
    throw error
  }
}

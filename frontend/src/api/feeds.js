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
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 응답 인터셉터
feedAPI.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("피드 API 오류:", error)

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
    console.error("피드 조회 실패:", error)
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
export const updateFeed = async (feedId, feedData, imageFiles = []) => {
  try {
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
    const { page = 1, size = 20 } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    const response = await feedAPI.get(`/${feedId}/comments?${queryParams}`)
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
 * @returns {Promise<Object>} - 생성된 댓글 정보
 */
export const createFeedComment = async (feedId, content) => {
  try {
    const response = await feedAPI.post(`/${feedId}/comments`, {
      content,
    })
    return response.data
  } catch (error) {
    console.error("피드 댓글 작성 실패:", error)
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
    const response = await feedAPI.delete(`/${feedId}/comments/${commentId}`)
    return response.data
  } catch (error) {
    console.error("피드 댓글 삭제 실패:", error)
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

    const response = await feedAPI.get(`/my-feeds?${queryParams}`)
    return response.data
  } catch (error) {
    console.error("내 피드 목록 조회 실패:", error)
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

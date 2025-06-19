import axios from "axios"

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// axios 인스턴스 생성 (기존 auth.js와 동일한 설정)
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 세션 쿠키 전송
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * 현재 로그인 상태 확인
 * @returns {boolean} 로그인 여부
 */
export const isLoggedIn = () => {
  const user = localStorage.getItem("user")
  if (!user) return false

  try {
    const userData = JSON.parse(user)
    return userData.isLoggedIn === true
  } catch (e) {
    return false
  }
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 * @returns {Object|null} 사용자 정보
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem("user")
  if (!user) return null

  try {
    return JSON.parse(user)
  } catch (e) {
    return null
  }
}

/**
 * 사용자 정보 업데이트 (localStorage)
 * @param {Object} userData - 업데이트할 사용자 정보
 */
export const updateCurrentUser = (userData) => {
  const currentUser = getCurrentUser()
  if (currentUser) {
    const updatedUser = { ...currentUser, ...userData }
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }
}

/**
 * 프로필 정보 조회
 * @returns {Promise<Object>} 프로필 데이터
 */
export const getMyProfile = async () => {
  try {
    if (!isLoggedIn()) {
      throw new Error("로그인이 필요합니다.")
    }

    const response = await api.get("/profile/me")
    return response.data
  } catch (error) {
    console.error("프로필 조회 실패:", error)

    // 401 에러인 경우 로그아웃 처리
    if (error.response?.status === 401) {
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    throw error
  }
}

/**
 * 프로필 정보 수정
 * @param {Object} profileData - 수정할 프로필 데이터
 * @param {File} profileImageFile - 프로필 이미지 파일 (선택사항)
 * @returns {Promise<Object>} 수정 결과
 */
export const updateProfile = async (profileData, profileImageFile = null) => {
  try {
    if (!isLoggedIn()) {
      throw new Error("로그인이 필요합니다.")
    }

    // FormData 생성
    const formData = new FormData()

    // JSON 데이터 추가
    formData.append("data", JSON.stringify(profileData))

    // 프로필 이미지 파일 추가
    if (profileImageFile) {
      formData.append("profile_picture", profileImageFile)
    }

    const response = await api.put("/profile/update", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    // 성공 시 localStorage의 사용자 정보 업데이트
    if (response.data.success && response.data.user) {
      updateCurrentUser({
        nickname: response.data.user.nickname,
        name: response.data.user.name,
        email: response.data.user.email,
        profile_picture: response.data.user.profile_picture,
      })
    }

    return response.data
  } catch (error) {
    console.error("프로필 수정 실패:", error)

    // 401 에러인 경우 로그아웃 처리
    if (error.response?.status === 401) {
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    throw error
  }
}

/**
 * 비밀번호 변경
 * @param {string} newPassword - 새 비밀번호
 * @returns {Promise<Object>} 변경 결과
 */
export const changePassword = async (newPassword) => {
  try {
    if (!isLoggedIn()) {
      throw new Error("로그인이 필요합니다.")
    }

    const response = await api.put("/profile/change-password", {
      new_password: newPassword,
    })

    return response.data
  } catch (error) {
    console.error("비밀번호 변경 실패:", error)

    // 401 에러인 경우 로그아웃 처리
    if (error.response?.status === 401) {
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    throw error
  }
}

/**
 * 프라이버시 설정 변경
 * @param {boolean} isPrivate - 비공개 계정 여부
 * @returns {Promise<Object>} 변경 결과
 */
export const updatePrivacySettings = async (isPrivate) => {
  try {
    if (!isLoggedIn()) {
      throw new Error("로그인이 필요합니다.")
    }

    const response = await api.put("/profile/privacy", {
      is_private: isPrivate,
    })

    return response.data
  } catch (error) {
    console.error("프라이버시 설정 변경 실패:", error)

    // 401 에러인 경우 로그아웃 처리
    if (error.response?.status === 401) {
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    throw error
  }
}

/**
 * 프로필 이미지 URL 생성 헬퍼 함수
 * @param {string} imagePath - 이미지 경로
 * @returns {string|null} 완전한 이미지 URL
 */
export const getProfileImageUrl = (imagePath) => {
  if (!imagePath) return null

  // 이미 전체 URL인 경우
  if (imagePath.startsWith("http")) {
    return imagePath
  }

  // 상대 경로인 경우 API 서버 URL과 결합
  return `${API_BASE_URL}${imagePath}`
}

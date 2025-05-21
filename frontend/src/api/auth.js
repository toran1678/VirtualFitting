import axios from "axios"

// const Backend_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8004";

// API 기본 설정
const API_URL = "http://localhost:8004"
// const API_URL = Backend_URL;

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 세션 쿠키 전송
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * 로그인 함수
 * @param {Object} credentials - 로그인 정보 (아이디, 비밀번호)
 * @returns {Promise<Object>} - 응답 데이터
 */
export const loginUser = async (credentials) => {
  try {
    // FormData 객체 생성
    const formData = new FormData()
    formData.append("id", credentials.id)
    formData.append("password", credentials.password)

    const response = await api.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    // 사용자 정보 저장
    const userData = {
      user_id: response.data.user.user_id,
      id: response.data.user.id,
      name: response.data.user.name,
      nickname: response.data.user.nickname,
      email: response.data.user.email,
      profile_picture: response.data.user.profile_picture,
      is_verified: response.data.user.is_verified,
      isLoggedIn: true,
    }

    localStorage.setItem("user", JSON.stringify(userData))

    return response.data
  } catch (error) {
    console.error("로그인 오류:", error)
    throw error
  }
}

/**
 * 로그아웃 함수
 * @returns {Promise<Object>} - 응답 데이터
 */
export const logoutUser = async () => {
  try {
    const response = await api.post("/auth/logout")
    localStorage.removeItem("user")
    return response.data
  } catch (error) {
    console.error("로그아웃 오류:", error)
    // 서버 오류가 발생해도 로컬 상태는 초기화
    localStorage.removeItem("user")
    throw error
  }
}

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
 * 아이디 저장 함수
 * @param {string} id - 저장할 아이디
 * @param {boolean} remember - 저장 여부
 */
export const saveRememberedId = (id, remember) => {
  if (remember) {
    localStorage.setItem("rememberedId", id)
  } else {
    localStorage.removeItem("rememberedId")
  }
}

/**
 * 저장된 아이디 가져오기
 * @returns {string|null} 저장된 아이디
 */
export const getRememberedId = () => {
  return localStorage.getItem("rememberedId")
}

/**
 * 이메일 인증 코드 요청
 * @param {string} email - 인증 코드를 받을 이메일 주소
 * @returns {Promise<Object>} - 응답 데이터
 */
export const requestEmailVerification = async (email) => {
  try {
    console.log(`이메일 인증 코드 요청: ${email}`)

    // 쿼리 파라미터로 요청
    const response = await api.post(`/auth/request-verification?email=${email}`)

    console.log("인증 코드 요청 성공:", response.data)
    return response.data
  } catch (error) {
    console.error("이메일 인증 코드 요청 오류:", error)

    // 오류 상세 정보 로깅
    if (error.response) {
      console.error("서버 응답:", error.response.data)
      console.error("상태 코드:", error.response.status)
    }

    throw error
  }
}

/**
 * 이메일 인증 코드 확인
 * @param {string} email - 인증할 이메일 주소
 * @param {string} code - 인증 코드
 * @returns {Promise<Object>} - 응답 데이터
 */
export const verifyEmailCode = async (email, code) => {
  try {
    console.log(`이메일 인증 코드 확인: ${email}, 코드: ${code}`)

    // 쿼리 파라미터로 요청
    const response = await api.post(`/auth/verify-email?email=${email}&code=${code}`)

    console.log("인증 코드 확인 성공:", response.data)
    return { success: true, ...response.data }
  } catch (error) {
    console.error("이메일 인증 코드 확인 오류:", error)

    if (error.response) {
      console.error("서버 응답:", error.response.data)
      console.error("상태 코드:", error.response.status)
    }

    throw error
  }
}

/**
 * 회원가입
 * @param {Object|FormData} userData - 회원가입 데이터
 * @returns {Promise<Object>} - 응답 데이터
 */
export const registerUser = async (userData) => {
  try {
    console.log("회원가입 요청:", userData instanceof FormData ? "FormData 객체" : userData)

    let response

    // FormData 객체인 경우 (프로필 이미지가 있는 경우)
    if (userData instanceof FormData) {
      response = await axios.post(`${API_URL}/register`, userData, {
        headers: {
          // multipart/form-data로 자동 설정됨
          "Content-Type": "multipart/form-data",
        },
      })
    } else {
      // JSON 데이터인 경우 (프로필 이미지가 없는 경우)
      const formData = new FormData()
      formData.append("data", JSON.stringify(userData))

      response = await axios.post(`${API_URL}/register`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    }

    console.log("회원가입 성공:", response.data)
    return response.data
  } catch (error) {
    console.error("회원가입 오류:", error)

    if (error.response) {
      console.error("서버 응답:", error.response.data)
      console.error("상태 코드:", error.response.status)
    }

    throw error
  }
}

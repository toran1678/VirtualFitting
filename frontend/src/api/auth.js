import axios from "axios"

// const Backend_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8004";

// API 기본 설정
const API_URL = "http://localhost:8004"
// const API_URL = Backend_URL;

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

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

/**
 * 로그인
 * @param {Object} credentials - 로그인 정보 (아이디, 비밀번호)
 * @returns {Promise<Object>} - 응답 데이터 (토큰 등)
 */
export const loginUser = async (credentials) => {
  try {
    console.log("로그인 요청:", credentials)

    const response = await api.post("/login", credentials)

    console.log("로그인 성공:", response.data)
    return response.data
  } catch (error) {
    console.error("로그인 오류:", error)

    if (error.response) {
      console.error("서버 응답:", error.response.data)
      console.error("상태 코드:", error.response.status)
    }

    throw error
  }
}

/**
 * 로그아웃
 * @returns {Promise<Object>} - 응답 데이터
 */
export const logoutUser = async () => {
  try {
    const response = await api.post("/logout")
    return response.data
  } catch (error) {
    console.error("로그아웃 오류:", error)
    throw error
  }
}

/**
 * 사용자 정보 조회
 * @param {string} token - 인증 토큰
 * @returns {Promise<Object>} - 사용자 정보
 */
export const getUserInfo = async (token) => {
  try {
    const response = await api.get("/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error)
    throw error
  }
}

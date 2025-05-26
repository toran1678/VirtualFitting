import axios from "axios"

// API 기본 설정
const API_URL = "http://localhost:8000"

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 세션 쿠키 전송
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * 카카오 OAuth 인증 URL 가져오기
 * @param {boolean} forceLogin - 강제 로그인 여부 (기본값: true)
 * @returns {Promise<Object>} - 인증 URL과 state
 */
export const getKakaoAuthUrl = async (forceLogin = true) => {
  try {
    console.log("카카오 인증 URL 요청 중... (강제 로그인:", forceLogin, ")")

    // forceLogin이 true면 prompt 파라미터 추가
    const params = forceLogin ? { prompt: "login" } : {}

    const response = await api.get("/auth/kakao/authorization-url", { params })
    console.log("카카오 인증 URL 응답:", response.data)
    return response.data
  } catch (error) {
    console.error("카카오 인증 URL 요청 오류:", error)
    console.error("응답 데이터:", error.response?.data)
    throw error
  }
}

/**
 * 카카오 인증 처리 - 사용자 확인 및 로그인/회원가입을 한 번에 처리
 * @param {string} authorizationCode - 카카오에서 받은 인증 코드
 * @returns {Promise<Object>} - 인증 처리 결과
 */
export const processKakaoAuth = async (authorizationCode) => {
  try {
    console.log("=== processKakaoAuth 시작 ===")
    console.log("authorization_code:", authorizationCode)

    const requestData = {
      authorization_code: authorizationCode,
    }

    console.log("요청 URL:", `${API_URL}/auth/kakao/process-auth`)
    console.log("요청 데이터:", requestData)

    const response = await api.post("/auth/kakao/process-auth", requestData)

    console.log("=== processKakaoAuth 응답 ===")
    console.log("응답 상태:", response.status)
    console.log("응답 데이터:", JSON.stringify(response.data, null, 2))

    // 로그인 성공 시 사용자 정보 저장
    if (response.data.user) {
      const userData = {
        ...response.data.user,
        isLoggedIn: true,
      }
      localStorage.setItem("user", JSON.stringify(userData))
      console.log("사용자 정보 localStorage에 저장:", userData)
    }

    return response.data
  } catch (error) {
    console.error("=== processKakaoAuth 오류 ===")
    console.error("Error object:", error)
    console.error("요청 데이터:", { authorization_code: authorizationCode })
    console.error("응답 데이터:", error.response?.data)
    console.error("응답 상태:", error.response?.status)
    console.error("응답 헤더:", error.response?.headers)
    throw error
  }
}

/**
 * 카카오 사용자 존재 여부 확인 (DEPRECATED - processKakaoAuth 사용 권장)
 * @param {string} authorizationCode - 카카오에서 받은 인증 코드
 * @returns {Promise<Object>} - 사용자 존재 여부와 카카오 정보
 */
export const checkKakaoUser = async (authorizationCode) => {
  try {
    console.log("카카오 사용자 확인 요청:", { authorization_code: authorizationCode })

    const requestData = {
      authorization_code: authorizationCode,
    }

    const response = await api.post("/auth/kakao/check-user", requestData)
    console.log("카카오 사용자 확인 응답:", response.data)
    return response.data
  } catch (error) {
    console.error("카카오 사용자 확인 오류:", error)
    console.error("요청 데이터:", { authorization_code: authorizationCode })
    console.error("응답 데이터:", error.response?.data)
    console.error("응답 상태:", error.response?.status)
    throw error
  }
}

/**
 * 카카오 회원가입 (프로필 사진 업로드 지원)
 * @param {Object} signupData - 회원가입 데이터 (kakao_id 포함)
 * @param {File} profilePicture - 프로필 사진 파일 (선택사항)
 * @returns {Promise<Object>} - 회원가입 결과
 */
export const kakaoSignup = async (signupData, profilePicture = null) => {
  try {
    console.log("카카오 회원가입 요청 데이터:", signupData)
    console.log("프로필 사진:", profilePicture)

    // 전화번호 형식 확인 및 수정
    let phoneNumber = signupData.phone_number
    if (phoneNumber && !phoneNumber.includes("-")) {
      // 하이픈이 없으면 추가
      if (phoneNumber.length === 11 && phoneNumber.startsWith("010")) {
        phoneNumber = `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`
      }
    }

    const requestData = {
      kakao_id: signupData.kakao_id,
      name: signupData.name,
      phone_number: phoneNumber,
      email: signupData.email,
      birth_date: signupData.birth_date,
      address: signupData.address,
      custom_nickname: signupData.custom_nickname,
    }

    console.log("최종 요청 데이터:", requestData)

    // FormData 생성 (파일 업로드 지원)
    const formData = new FormData()
    formData.append("data", JSON.stringify(requestData))

    // 프로필 사진이 있는 경우 추가
    if (profilePicture) {
      formData.append("profile_picture", profilePicture)
      console.log("프로필 사진 추가됨:", profilePicture.name)
    }

    // Content-Type을 multipart/form-data로 설정
    const response = await api.post("/auth/kakao/signup", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    console.log("카카오 회원가입 응답:", response.data)

    // 회원가입 성공 시 사용자 정보 저장
    if (response.data.user) {
      const userData = {
        ...response.data.user,
        isLoggedIn: true,
      }
      localStorage.setItem("user", JSON.stringify(userData))
    }

    return response.data
  } catch (error) {
    console.error("카카오 회원가입 오류:", error)
    console.error("요청 데이터:", signupData)
    console.error("응답 데이터:", error.response?.data)
    console.error("응답 상태:", error.response?.status)
    throw error
  }
}

/**
 * 카카오 로그인 (기존 사용자) - DEPRECATED: processKakaoAuth 사용 권장
 * @param {string} authorizationCode - 카카오에서 받은 인증 코드
 * @returns {Promise<Object>} - 로그인 결과
 */
export const kakaoLogin = async (authorizationCode) => {
  try {
    console.log("카카오 로그인 요청:", { authorization_code: authorizationCode })

    const requestData = {
      authorization_code: authorizationCode,
    }

    const response = await api.post("/auth/kakao/login", requestData)
    console.log("카카오 로그인 응답:", response.data)

    // 로그인 성공 시 사용자 정보 저장
    if (response.data.user) {
      const userData = {
        ...response.data.user,
        isLoggedIn: true,
      }
      localStorage.setItem("user", JSON.stringify(userData))
    }

    return response.data
  } catch (error) {
    console.error("카카오 로그인 오류:", error)
    console.error("요청 데이터:", { authorization_code: authorizationCode })
    console.error("응답 데이터:", error.response?.data)
    console.error("응답 상태:", error.response?.status)
    throw error
  }
}

/**
 * URL에서 카카오 인증 코드 추출
 * @returns {string|null} - 인증 코드
 */
export const getKakaoAuthCodeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get("code")
  console.log("URL에서 추출한 인증 코드:", code)
  return code
}

/**
 * URL에서 카카오 state 추출
 * @returns {string|null} - state 값
 */
export const getKakaoStateFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const state = urlParams.get("state")
  console.log("URL에서 추출한 state:", state)
  return state
}

/**
 * URL에서 카카오 에러 추출
 * @returns {string|null} - 에러 코드
 */
export const getKakaoErrorFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const error = urlParams.get("error")
  console.log("URL에서 추출한 에러:", error)
  return error
}

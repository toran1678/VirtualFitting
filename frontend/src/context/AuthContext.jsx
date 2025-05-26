"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { loginUser as apiLoginUser, logoutUser as apiLogoutUser, isLoggedIn, getCurrentUser } from "../api/auth"
import {
  getKakaoAuthUrl,
  processKakaoAuth,
  kakaoSignup,
  getKakaoAuthCodeFromUrl,
  getKakaoStateFromUrl,
  getKakaoErrorFromUrl,
} from "../api/kakaoAuth"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// 카카오 인증 훅도 같은 Context에서 제공
export const useKakaoAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useKakaoAuth must be used within an AuthProvider")
  }
  return {
    startKakaoLogin: context.startKakaoLogin,
    handleKakaoCallback: context.handleKakaoCallback,
    completeKakaoSignup: context.completeKakaoSignup,
    restartKakaoAuth: context.restartKakaoAuth,
    kakaoUserInfo: context.kakaoUserInfo,
    isLoading: context.loading,
    error: context.error,
    setKakaoUserInfo: context.setKakaoUserInfo,
    setError: context.setError,
    authSuccess: context.authSuccess,
    clearAuthSuccess: context.clearAuthSuccess,
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(null) // 인증 성공 상태

  // 카카오 관련 상태
  const [kakaoUserInfo, setKakaoUserInfo] = useState(null)

  // 초기 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus()

    // 카카오 정보 복구 시도
    const savedKakaoInfo = sessionStorage.getItem("kakao_user_info") || localStorage.getItem("temp_kakao_info")
    if (savedKakaoInfo) {
      try {
        const kakaoInfo = JSON.parse(savedKakaoInfo)
        console.log("저장된 카카오 정보 복구:", kakaoInfo)
        setKakaoUserInfo(kakaoInfo)
      } catch (error) {
        console.error("카카오 정보 복구 실패:", error)
      }
    }
  }, [])

  // 로컬 스토리지 변경 감지 (다른 탭에서의 변경만 감지됨)
  useEffect(() => {
    const handleStorageChange = () => {
      checkAuthStatus()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const checkAuthStatus = () => {
    try {
      const loginStatus = isLoggedIn()
      setIsAuthenticated(loginStatus)

      if (loginStatus) {
        const userData = getCurrentUser()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("인증 상태 확인 오류:", error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // 인증 성공 상태 클리어
  const clearAuthSuccess = () => {
    setAuthSuccess(null)
  }

  // 일반 로그인
  const login = async (credentials) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiLoginUser(credentials)

      // 로그인 성공 시 상태 즉시 업데이트
      const userData = getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)
      setAuthSuccess({ type: "login", message: "로그인 성공" })

      return response
    } catch (error) {
      console.error("로그인 오류:", error)
      setError(error.message || "로그인 중 오류가 발생했습니다.")
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 로그아웃
  const logout = async () => {
    try {
      setLoading(true)
      await apiLogoutUser()

      // 로그아웃 성공 시 상태 즉시 초기화
      setUser(null)
      setIsAuthenticated(false)
      setKakaoUserInfo(null)
      setError(null)
      setAuthSuccess(null)

      return true
    } catch (error) {
      console.error("로그아웃 오류:", error)
      // 서버 오류가 발생해도 로컬 상태는 초기화
      setUser(null)
      setIsAuthenticated(false)
      setKakaoUserInfo(null)
      setError(null)
      setAuthSuccess(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 사용자 정보 업데이트
  const updateUser = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    setError(null)
    // 로컬 스토리지도 업데이트
    if (userData) {
      localStorage.setItem("user", JSON.stringify({ ...userData, isLoggedIn: true }))
    }
  }

  // 수동으로 상태를 새로고침하는 함수
  const refreshAuth = () => {
    checkAuthStatus()
  }

  // === 카카오 로그인 관련 함수들 ===

  // 카카오 로그인 시작
  const startKakaoLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("카카오 로그인 시작...")
      const { authorization_url, state } = await getKakaoAuthUrl()
      console.log("인증 URL:", authorization_url)

      // state를 세션 스토리지에 저장 (CSRF 방지)
      sessionStorage.setItem("kakao_oauth_state", state)

      // 카카오 인증 페이지로 리다이렉트
      window.location.href = authorization_url
    } catch (err) {
      console.error("카카오 로그인 시작 오류:", err)
      setError(err.message || "카카오 로그인 시작 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 카카오 콜백 처리 (새로운 통합 방식)
  const handleKakaoCallback = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("=== 카카오 콜백 처리 시작 ===")
      console.log("현재 URL:", window.location.href)

      // URL에서 파라미터 추출
      const code = getKakaoAuthCodeFromUrl()
      const state = getKakaoStateFromUrl()
      const urlError = getKakaoErrorFromUrl()

      console.log("URL 파라미터:", { code, state, urlError })

      // 에러 체크
      if (urlError) {
        throw new Error(`카카오 인증 오류: ${urlError}`)
      }

      // 인증 코드 체크
      if (!code) {
        throw new Error("인증 코드가 없습니다.")
      }

      // state 검증 (CSRF 방지)
      const savedState = sessionStorage.getItem("kakao_oauth_state")
      console.log("State 검증:", { received: state, saved: savedState })

      // 세션 스토리지 정리
      sessionStorage.removeItem("kakao_oauth_state")

      console.log("카카오 인증 처리 중... authorization_code:", code)

      // 새로운 통합 API 사용 - authorization code를 한 번만 사용
      const authResult = await processKakaoAuth(code)
      console.log("=== 카카오 인증 처리 결과 ===")
      console.log(JSON.stringify(authResult, null, 2))

      if (authResult.needs_signup) {
        // 신규 사용자 - 추가 정보 입력 필요
        console.log("신규 사용자 - 추가 정보 입력 필요")
        console.log("카카오 정보:", authResult.kakao_info)

        // 카카오 정보를 여러 곳에 저장
        setKakaoUserInfo(authResult.kakao_info)

        // 세션 스토리지에도 백업 저장
        sessionStorage.setItem("kakao_user_info", JSON.stringify(authResult.kakao_info))

        // 로컬 스토리지에도 임시 저장
        localStorage.setItem("temp_kakao_info", JSON.stringify(authResult.kakao_info))

        return {
          needsSignup: true,
          kakaoInfo: authResult.kakao_info,
        }
      } else if (authResult.user) {
        // 기존 사용자 - 로그인 완료
        console.log("기존 사용자 로그인 완료")
        updateUser(authResult.user)

        // 성공 상태 설정 (컴포넌트에서 네비게이션 처리)
        setAuthSuccess({
          type: "kakao_login",
          message: authResult.message,
          shouldNavigateToMain: true,
        })

        return { success: true, isExistingUser: true, message: authResult.message }
      } else {
        console.error("예상치 못한 응답:", authResult)
        throw new Error("예상치 못한 응답입니다.")
      }
    } catch (err) {
      console.error("=== 카카오 콜백 처리 오류 ===")
      console.error("Error object:", err)
      console.error("Error response:", err.response)
      console.error("Error response data:", err.response?.data)
      console.error("Error response status:", err.response?.status)

      // Rate Limit 에러 처리
      let errorMessage = "카카오 로그인 처리 중 오류가 발생했습니다."

      if (err.response?.status === 429) {
        errorMessage = "카카오 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
      } else if (err.response?.status === 400 && err.response?.data?.detail?.includes("만료")) {
        errorMessage = "인증 코드가 만료되었습니다. 다시 로그인해주세요."
        // 새로운 인증 시작
        setTimeout(() => {
          startKakaoLogin()
        }, 2000)
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 카카오 회원가입 완료
  const completeKakaoSignup = async (signupData, profilePicture = null) => {
    try {
      setLoading(true)
      setError(null)

      console.log("카카오 회원가입 요청:", signupData)
      console.log("프로필 사진:", profilePicture)

      // 카카오 정보 확인
      const finalSignupData = {
        ...signupData,
        kakao_id: kakaoUserInfo?.id, // 카카오 ID 사용
      }

      if (!finalSignupData.kakao_id) {
        throw new Error("카카오 정보가 없습니다. 다시 로그인해주세요.")
      }

      console.log("최종 회원가입 데이터:", finalSignupData)

      // 프로필 사진과 함께 회원가입 요청
      const result = await kakaoSignup(finalSignupData, profilePicture)
      console.log("카카오 회원가입 응답:", result)

      // 회원가입 성공 시 AuthContext 상태 업데이트
      if (result.user) {
        updateUser(result.user)

        // 성공 상태 설정 (컴포넌트에서 네비게이션 처리)
        setAuthSuccess({
          type: "kakao_signup",
          message: result.message || "회원가입이 완료되었습니다!",
          shouldNavigateToMain: true,
        })
      }

      return result
    } catch (error) {
      console.error("카카오 회원가입 오류:", error)

      let errorMessage = "카카오 회원가입 중 오류가 발생했습니다."

      if (error.response?.status === 429) {
        errorMessage = "카카오 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
      } else if (error.response?.data?.detail) {
        errorMessage =
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail)
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 새로운 인증 시작 함수
  const restartKakaoAuth = () => {
    setKakaoUserInfo(null)
    setError(null)
    setAuthSuccess(null)
    startKakaoLogin()
  }

  const value = {
    // 기존 일반 로그인 관련
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    refreshAuth,

    // 카카오 로그인 관련
    kakaoUserInfo,
    error,
    startKakaoLogin,
    handleKakaoCallback,
    completeKakaoSignup,
    restartKakaoAuth,
    setKakaoUserInfo,
    setError,

    // 인증 성공 상태
    authSuccess,
    clearAuthSuccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }

"use client"

import { useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  getKakaoAuthUrl,
  checkKakaoUser,
  kakaoSignup,
  kakaoLogin,
  getKakaoAuthCodeFromUrl,
  getKakaoStateFromUrl,
  getKakaoErrorFromUrl,
} from "../api/kakaoAuth"

export const useKakaoAuth = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kakaoUserInfo, setKakaoUserInfo] = useState(null)
  const [authorizationCode, setAuthorizationCode] = useState(null)

  // 중복 호출 방지를 위한 ref
  const callbackProcessed = useRef(false)
  const signupProcessed = useRef(false)

  // 카카오 로그인 시작
  const startKakaoLogin = useCallback(async () => {
    try {
      setIsLoading(true)
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
      setError("카카오 로그인 시작 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 카카오 콜백 처리
  const handleKakaoCallback = useCallback(async () => {
    // 중복 실행 방지
    if (callbackProcessed.current) {
      console.log("콜백 이미 처리됨 - 중복 실행 방지")
      return null
    }

    try {
      setIsLoading(true)
      setError(null)
      callbackProcessed.current = true // 처리 시작 플래그

      console.log("=== 카카오 콜백 처리 시작 ===")
      console.log("처리 시간:", new Date().toISOString())

      // URL에서 파라미터 추출
      const code = getKakaoAuthCodeFromUrl()
      const state = getKakaoStateFromUrl()
      const urlError = getKakaoErrorFromUrl()

      console.log("URL 파라미터:", {
        code: code ? code.substring(0, 20) + "..." : null,
        state,
        error: urlError,
      })

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

      if (state && savedState && state !== savedState) {
        console.warn("State 불일치 - 보안상 주의 필요")
      }

      // 세션 스토리지 정리
      sessionStorage.removeItem("kakao_oauth_state")

      console.log("사용자 존재 여부 확인 중...")
      // 사용자 존재 여부 확인
      const userCheckResult = await checkKakaoUser(code)
      console.log("사용자 확인 결과:", userCheckResult)

      setKakaoUserInfo(userCheckResult.kakao_info)
      setAuthorizationCode(code)

      if (userCheckResult.user_exists) {
        // 기존 사용자 - 바로 로그인
        console.log("기존 사용자 로그인 시도...")
        const loginResult = await kakaoLogin(code)
        console.log("로그인 결과:", loginResult)
        alert(loginResult.message)
        navigate("/") // 메인 페이지로 이동
        return null
      } else {
        // 신규 사용자 - 추가 정보 입력 필요
        console.log("신규 사용자 - 추가 정보 입력 필요")
        return {
          needsSignup: true,
          kakaoInfo: userCheckResult.kakao_info,
          authorizationCode: code,
        }
      }
    } catch (err) {
      console.error("카카오 콜백 처리 오류:", err)
      setError(err.message || "카카오 로그인 처리 중 오류가 발생했습니다.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  // 전화번호 형식 검증 및 변환
  const formatPhoneNumber = (phoneNumber) => {
    const numbers = phoneNumber.replace(/[^\d]/g, "")

    if (numbers.length === 11 && numbers.startsWith("010")) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }

    if (/^010-\d{4}-\d{4}$/.test(phoneNumber)) {
      return phoneNumber
    }

    throw new Error("올바른 전화번호 형식이 아닙니다 (010-XXXX-XXXX)")
  }

  // 카카오 회원가입 (추가 정보와 함께)
  const completeKakaoSignup = useCallback(
    async (additionalInfo) => {
      // 중복 실행 방지
      if (signupProcessed.current) {
        console.log("회원가입 이미 처리됨 - 중복 실행 방지")
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        signupProcessed.current = true // 처리 시작 플래그

        console.log("=== 카카오 회원가입 시작 ===")
        console.log("처리 시간:", new Date().toISOString())
        console.log("인증 코드 확인:", authorizationCode ? "있음" : "없음")

        if (!authorizationCode) {
          throw new Error("인증 코드가 없습니다.")
        }

        // 전화번호 형식 검증 및 변환
        const formattedPhoneNumber = formatPhoneNumber(additionalInfo.phoneNumber)
        console.log("전화번호 형식 변환:", additionalInfo.phoneNumber, "→", formattedPhoneNumber)

        const signupData = {
          authorization_code: authorizationCode,
          name: additionalInfo.name,
          phone_number: formattedPhoneNumber,
          email: additionalInfo.email || kakaoUserInfo?.email,
          birth_date: additionalInfo.birthDate || null,
          address: additionalInfo.address || null,
          custom_nickname: additionalInfo.customNickname || null,
        }

        console.log("최종 회원가입 데이터:", signupData)
        const result = await kakaoSignup(signupData)
        console.log("회원가입 결과:", result)

        alert(result.message)
        navigate("/") // 메인 페이지로 이동

        return result
      } catch (err) {
        console.error("카카오 회원가입 오류:", err)
        signupProcessed.current = false // 실패 시 플래그 리셋
        const errorMessage = err.response?.data?.detail || err.message || "카카오 회원가입 중 오류가 발생했습니다."
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [authorizationCode, kakaoUserInfo, navigate],
  )

  return {
    isLoading,
    error,
    kakaoUserInfo,
    authorizationCode,
    startKakaoLogin,
    handleKakaoCallback,
    completeKakaoSignup,
    setError,
  }
}

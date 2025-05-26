"use client"

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
//import { useKakaoAuth } from "../../hooks/useKakaoAuth"
import { useKakaoAuth } from "../../context/AuthContext"
import styles from "./KakaoCallback.module.css"

const KakaoCallback = () => {
  const navigate = useNavigate()
  const { handleKakaoCallback, error, authSuccess, clearAuthSuccess } = useKakaoAuth()
  const [processing, setProcessing] = useState(true)
  // const [processResult, setProcessResult] = useState(null)

  // 중복 실행 방지를 위한 ref
  const hasProcessed = useRef(false)
  const isProcessing = useRef(false)

  // authSuccess 상태 감지하여 네비게이션 처리
  useEffect(() => {
    if (authSuccess?.shouldNavigateToMain) {
      console.log("인증 성공 - 메인 페이지로 이동:", authSuccess.message)
      // alert(authSuccess.message)

      setTimeout(() => {
        clearAuthSuccess()
        navigate("/", { replace: true })
      }, 1000)
    }
  }, [authSuccess, navigate, clearAuthSuccess])

  useEffect(() => {
    const processCallback = async () => {
      // 이미 처리했거나 처리 중인 경우 중단
      if (hasProcessed.current || isProcessing.current) {
        console.log("이미 처리됨 또는 처리 중 - 중복 실행 방지")
        return
      }

      // 처리 시작 플래그 설정
      isProcessing.current = true

      try {
        console.log("=== 카카오 콜백 처리 시작 ===")
        console.log("현재 URL:", window.location.href)

        const result = await handleKakaoCallback()

        // 처리 완료 플래그 설정
        hasProcessed.current = true
        // setProcessResult(result)

        if (result?.needsSignup) {
          console.log("신규 사용자 - 회원가입 페이지로 이동")
          // 약간의 지연 후 이동 (상태 업데이트 완료 대기)
          setTimeout(() => {
            navigate("/register", {
              state: {
                kakaoSignup: true,
                kakaoInfo: result.kakaoInfo,
                authorizationCode: result.authorizationCode,
              },
              replace: true,
            })
          }, 100)
        }
        // 기존 사용자 로그인 성공은 authSuccess useEffect에서 처리
      } catch (err) {
        console.error("카카오 콜백 처리 오류:", err)
        hasProcessed.current = true
        alert("카카오 로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
        navigate("/register")
      } finally {
        setProcessing(false)
        isProcessing.current = false
      }
    }

    // URL에 code 파라미터가 있는 경우에만 처리
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")

    if (code && !hasProcessed.current) {
      console.log("인증 코드 발견, 콜백 처리 시작:", code.substring(0, 20) + "...")
      processCallback()
    } else if (!code) {
      console.log("인증 코드가 없음 - 회원가입 페이지로 이동")
      navigate("/register")
    }// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 빈 의존성 배열로 한 번만 실행

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      console.log("KakaoCallback 컴포넌트 언마운트")
    }
  }, [])

  if (error) {
    return (
      <div className={styles.kakaoCallbackPage}>
        <div className={styles.kakaoCallbackContainer}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>❌</div>
            <h2 className={styles.errorTitle}>로그인 오류</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button className={styles.retryButton} onClick={() => navigate("/register")}>
              회원가입 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.kakaoCallbackPage}>
      <div className={styles.kakaoCallbackContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinnerRing}></div>
          </div>
          <h2 className={styles.loadingTitle}>카카오 로그인 처리 중...</h2>
          <p className={styles.loadingMessage}>
            {processing ? "인증 정보를 확인하고 있습니다..." : "처리가 완료되었습니다."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default KakaoCallback

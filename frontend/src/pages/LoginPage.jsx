"use client"

import { useState, useContext, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ThemeContext } from "../context/ThemeContext"
import "../styles/LoginPage.css"
import { loginUser, saveRememberedId, getRememberedId } from "../api/auth"

const LoginPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    id: "",
    password: "",
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState("")

  // 컴포넌트 마운트 시 저장된 아이디 불러오기
  useEffect(() => {
    const savedId = getRememberedId()
    if (savedId) {
      setFormData(prev => ({ ...prev, id: savedId }))
      setRememberMe(true)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    
    // 입력 시 에러 메시지 초기화
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      })
    }
    
    // 로그인 에러 메시지 초기화
    if (loginError) {
      setLoginError("")
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.id) newErrors.id = "아이디를 입력해주세요"
    if (!formData.password) newErrors.password = "비밀번호를 입력해주세요"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      setLoginError("");

      try {
        console.log("로그인 시도 중...");
        // auth.js의 loginUser 함수 사용
        const result = await loginUser(formData);
        console.log("로그인 결과:", result);
        
        // 아이디 저장 처리
        saveRememberedId(formData.id, rememberMe);
        
        // 메인 페이지로 이동
        navigate("/");
      } catch (error) {
        console.error("로그인 오류:", error);
        
        // 서버에서 반환한 에러 메시지 표시
        if (error.response) {
          const detail = error.response.data?.detail
          if (detail) {
            setLoginError(detail)
          } else {
            setLoginError(`오류 코드 ${error.response.status}: 서버에서 에러 응답이 왔습니다.`)
          }
        } else {
          setLoginError("서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.")
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  const handleKakaoLogin = () => {
    // 카카오 로그인 API 연동 코드
    console.log("카카오 로그인 시도")
    alert("카카오 로그인 기능은 현재 개발 중입니다.")
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">패션 가이즈에 오신 것을 환영합니다</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* 로그인 에러 메시지 표시 */}
          {loginError && (
            <div className="login-error-message">
              {loginError}
            </div>
          )}

          <div className="form-group">
            <div className="input-container">
              <svg
                className="input-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="text"
                id="id"
                name="id"
                placeholder="아이디"
                value={formData.id}
                onChange={handleChange}
                className={errors.id ? "error" : ""}
              />
            </div>
            {errors.id && <span className="error-message">{errors.id}</span>}
          </div>

          <div className="form-group">
            <div className="input-container">
              <svg
                className="input-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "error" : ""}
              />
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="remember-forgot">
            <div className="remember-me">
              <input type="checkbox" id="remember" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
              <label htmlFor="remember">아이디 저장</label>
            </div>
            <Link to="/forgot-password" className="forgot-password">
              비밀번호 찾기
            </Link>
          </div>

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="spinner">
                <div className="bounce1"></div>
                <div className="bounce2"></div>
                <div className="bounce3"></div>
              </div>
            ) : (
              "로그인"
            )}
          </button>

          <div className="divider">
            <span>또는</span>
          </div>

          <button type="button" className="kakao-login-btn" onClick={handleKakaoLogin}>
            <svg
              className="kakao-icon"
              width="18"
              height="18"
              viewBox="0 0 256 256"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
            >
              <path
                d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.943-24.811 43.944-29.04 5.995.849 12.168 1.29 18.472 1.29 57.438 0 104-36.712 104-82 0-45.287-46.562-82-104-82z"
                fill="#000"
              />
            </svg>
            카카오로 로그인
          </button>
        </form>

        <div className="register-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </div>
      </div>

      <div className="login-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  )
}

export default LoginPage
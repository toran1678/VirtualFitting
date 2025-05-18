"use client"

import { useState, useContext, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ThemeContext } from "../context/ThemeContext"
import "../styles/RegisterPage.css"

const RegisterPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const verificationInputRef = useRef(null)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    email: "",
    birthDate: "",
    phoneNumber: "",
    address: "",
    profilePicture: null,
    verificationCode: "",
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [currentStep, setCurrentStep] = useState(1)

  // 이메일 인증 관련 상태
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationTimer, setVerificationTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  useEffect(() => {
    let interval = null
    if (timerActive && verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(verificationTimer - 1)
      }, 1000)
    } else if (verificationTimer === 0) {
      setTimerActive(false)
      if (emailVerificationSent && !emailVerified) {
        // 인증 시간 만료
        setEmailVerificationSent(false)
      }
    }
    return () => clearInterval(interval)
  }, [timerActive, verificationTimer, emailVerificationSent, emailVerified])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "phoneNumber") {
      // 전화번호 입력 처리 - 숫자만 허용하고 자동으로 하이픈 추가
      const numericValue = value.replace(/[^0-9]/g, "")
      const formattedValue = formatPhoneNumber(numericValue)
      setFormData({
        ...formData,
        [name]: formattedValue,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }

    // 실시간 유효성 검사
    validateField(name, name === "phoneNumber" ? formatPhoneNumber(value.replace(/[^0-9]/g, "")) : value)
  }

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value) => {
    if (!value) return value

    // 숫자만 추출
    const phoneNumber = value.replace(/[^\d]/g, "")

    // 전화번호 형식에 맞게 하이픈 추가
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`
    }
  }

  const validateField = (name, value) => {
    const newErrors = { ...errors }

    switch (name) {
      case "id":
        if (!value) {
          newErrors.id = "아이디를 입력해주세요"
        } else if (value.length < 4) {
          newErrors.id = "아이디는 4자 이상이어야 합니다"
        } else {
          delete newErrors.id
        }
        break

      case "password":
        if (!value) {
          newErrors.password = "비밀번호를 입력해주세요"
          setPasswordStrength(0)
        } else {
          // 비밀번호 강도 측정
          let strength = 0
          if (value.length >= 8) strength += 1
          if (/[A-Z]/.test(value)) strength += 1
          if (/[a-z]/.test(value)) strength += 1
          if (/[0-9]/.test(value)) strength += 1
          if (/[^A-Za-z0-9]/.test(value)) strength += 1

          setPasswordStrength(strength)

          if (strength < 3) {
            newErrors.password = "비밀번호가 너무 약합니다"
          } else {
            delete newErrors.password
          }
        }

        // 비밀번호 확인 필드도 검증
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = "비밀번호가 일치하지 않습니다"
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword
        }
        break

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "비밀번호 확인을 입력해주세요"
        } else if (value !== formData.password) {
          newErrors.confirmPassword = "비밀번호가 일치하지 않습니다"
        } else {
          delete newErrors.confirmPassword
        }
        break

      case "name":
        if (!value) {
          newErrors.name = "이름을 입력해주세요"
        } else {
          delete newErrors.name
        }
        break

      case "nickname":
        if (!value) {
          newErrors.nickname = "닉네임을 입력해주세요"
        } else {
          delete newErrors.nickname
        }
        break

      case "email":
        if (!value) {
          newErrors.email = "이메일을 입력해주세요"
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = "유효한 이메일 주소를 입력해주세요"
        } else {
          delete newErrors.email
          // 이메일이 변경되면 인증 상태 초기화
          if (value !== formData.email) {
            setEmailVerified(false)
            setEmailVerificationSent(false)
          }
        }
        break

      case "phoneNumber":
        if (!value) {
          newErrors.phoneNumber = "전화번호를 입력해주세요"
        } else if (!/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/.test(value.replace(/-/g, ""))) {
          newErrors.phoneNumber = "유효한 전화번호를 입력해주세요"
        } else {
          delete newErrors.phoneNumber
        }
        break

      case "verificationCode":
        if (emailVerificationSent && !value) {
          newErrors.verificationCode = "인증 코드를 입력해주세요"
        } else {
          delete newErrors.verificationCode
        }
        break

      default:
        break
    }

    setErrors(newErrors)
  }

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        profilePicture: file,
      })

      // 이미지 미리보기
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.id) newErrors.id = "아이디를 입력해주세요"
      if (!formData.password) newErrors.password = "비밀번호를 입력해주세요"
      if (!formData.confirmPassword) newErrors.confirmPassword = "비밀번호 확인을 입력해주세요"
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "비밀번호가 일치하지 않습니다"
      }
      if (passwordStrength < 3) {
        newErrors.password = "비밀번호가 너무 약합니다"
      }
    } else if (step === 2) {
      if (!formData.name) newErrors.name = "이름을 입력해주세요"
      if (!formData.nickname) newErrors.nickname = "닉네임을 입력해주세요"
      if (!formData.email) newErrors.email = "이메일을 입력해주세요"
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "유효한 이메일 주소를 입력해주세요"
      }
      if (!emailVerified) {
        newErrors.email = "이메일 인증이 필요합니다"
      }
      if (!formData.phoneNumber) newErrors.phoneNumber = "전화번호를 입력해주세요"
      if (
        formData.phoneNumber &&
        !/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/.test(formData.phoneNumber.replace(/-/g, ""))
      ) {
        newErrors.phoneNumber = "유효한 전화번호를 입력해주세요"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const prevStep = () => {
    setCurrentStep(currentStep - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (validateStep(currentStep)) {
      setIsSubmitting(true)

      try {
        // 여기에 API 호출 코드 추가
        console.log("회원가입 데이터:", formData)

        // 성공 시 로그인 페이지로 이동
        setTimeout(() => {
          alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.")
          navigate("/login")
        }, 1500)
      } catch (error) {
        console.error("회원가입 오류:", error)
        alert("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleKakaoLogin = () => {
    // 카카오 로그인 API 연동 코드
    console.log("카카오 로그인 시도")
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
        return ""
      case 1:
        return "매우 약함"
      case 2:
        return "약함"
      case 3:
        return "보통"
      case 4:
        return "강함"
      case 5:
        return "매우 강함"
      default:
        return ""
    }
  }

  const getPasswordStrengthClass = () => {
    switch (passwordStrength) {
      case 1:
        return "very-weak"
      case 2:
        return "weak"
      case 3:
        return "medium"
      case 4:
        return "strong"
      case 5:
        return "very-strong"
      default:
        return ""
    }
  }

  // 이메일 인증 코드 발송 함수
  const sendVerificationCode = () => {
    if (!formData.email || errors.email) {
      alert("유효한 이메일 주소를 입력해주세요.")
      return
    }

    setIsVerifying(true)

    // 실제 구현에서는 API 호출로 대체
    setTimeout(() => {
      setEmailVerificationSent(true)
      setIsVerifying(false)
      setVerificationTimer(180) // 3분 타이머 설정
      setTimerActive(true)
      alert(`${formData.email}로 인증 코드가 발송되었습니다. 3분 내에 입력해주세요.`)

      // 인증 코드 입력 필드에 포커스
      if (verificationInputRef.current) {
        verificationInputRef.current.focus()
      }
    }, 1500)
  }

  // 이메일 인증 코드 확인 함수
  const verifyCode = () => {
    if (!formData.verificationCode) {
      setErrors({
        ...errors,
        verificationCode: "인증 코드를 입력해주세요",
      })
      return
    }

    setIsVerifying(true)

    // 실제 구현에서는 API 호출로 대체
    setTimeout(() => {
      // 예시로 "123456"을 올바른 코드로 가정
      if (formData.verificationCode === "123456") {
        setEmailVerified(true)
        setTimerActive(false)
        alert("이메일 인증이 완료되었습니다.")
      } else {
        setErrors({
          ...errors,
          verificationCode: "인증 코드가 일치하지 않습니다",
        })
      }
      setIsVerifying(false)
    }, 1000)
  }

  // 타이머 포맷팅 함수
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">패션 가이즈의 회원이 되어 다양한 서비스를 이용해보세요</p>
        </div>

        {currentStep === 1 && (
          <>
            <div className="social-login">
              <button className="kakao-login-btn" onClick={handleKakaoLogin}>
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
                카카오로 시작하기
              </button>
            </div>

            <div className="divider">
              <span>또는</span>
            </div>
          </>
        )}

        <form className="register-form" onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className="form-step">
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
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bars">
                      <div className={`strength-bar ${passwordStrength >= 1 ? getPasswordStrengthClass() : ""}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 2 ? getPasswordStrengthClass() : ""}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 3 ? getPasswordStrengthClass() : ""}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 4 ? getPasswordStrengthClass() : ""}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 5 ? getPasswordStrengthClass() : ""}`}></div>
                    </div>
                    <span className={`strength-text ${getPasswordStrengthClass()}`}>{getPasswordStrengthText()}</span>
                  </div>
                )}
                {errors.password && <span className="error-message">{errors.password}</span>}
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
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="비밀번호 확인"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? "error" : ""}
                  />
                </div>
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <button type="button" className="next-button" onClick={nextStep}>
                다음 단계
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="form-step">
              <div className="profile-picture-section">
                <div className="profile-picture-container" onClick={triggerFileInput}>
                  {previewImage ? (
                    <img src={previewImage || "/placeholder.svg"} alt="프로필 미리보기" className="profile-preview" />
                  ) : (
                    <div className="profile-placeholder">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="40"
                        height="40"
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
                    </div>
                  )}
                  <input
                    type="file"
                    id="profilePicture"
                    name="profilePicture"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="profile-input"
                    ref={fileInputRef}
                  />
                  <span className="profile-upload-text">프로필 사진 선택</span>
                </div>
              </div>

              <div className="form-row">
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
                      id="name"
                      name="name"
                      placeholder="이름"
                      value={formData.name}
                      onChange={handleChange}
                      className={errors.name ? "error" : ""}
                    />
                  </div>
                  {errors.name && <span className="error-message">{errors.name}</span>}
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input
                      type="text"
                      id="nickname"
                      name="nickname"
                      placeholder="닉네임"
                      value={formData.nickname}
                      onChange={handleChange}
                      className={errors.nickname ? "error" : ""}
                    />
                  </div>
                  {errors.nickname && <span className="error-message">{errors.nickname}</span>}
                </div>
              </div>

              <div className="form-group">
                <div className="email-verification-container">
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="이메일"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? "error" : ""}
                      disabled={emailVerified}
                    />
                  </div>
                  <button
                    type="button"
                    className={`verification-button ${emailVerified ? "verified" : ""}`}
                    onClick={sendVerificationCode}
                    disabled={isVerifying || emailVerified || !formData.email || !!errors.email}
                  >
                    {isVerifying ? (
                      <div className="spinner-small">
                        <div className="bounce1"></div>
                        <div className="bounce2"></div>
                        <div className="bounce3"></div>
                      </div>
                    ) : emailVerified ? (
                      <>
                        <svg
                          className="verified-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        인증완료
                      </>
                    ) : (
                      "인증코드 발송"
                    )}
                  </button>
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}

                {emailVerificationSent && !emailVerified && (
                  <div className="verification-code-container">
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
                        type="text"
                        id="verificationCode"
                        name="verificationCode"
                        placeholder="인증 코드 입력"
                        value={formData.verificationCode}
                        onChange={handleChange}
                        className={errors.verificationCode ? "error" : ""}
                        ref={verificationInputRef}
                      />
                      {timerActive && <span className="verification-timer">{formatTime(verificationTimer)}</span>}
                    </div>
                    <button
                      type="button"
                      className="verify-code-button"
                      onClick={verifyCode}
                      disabled={isVerifying || !formData.verificationCode}
                    >
                      {isVerifying ? (
                        <div className="spinner-small">
                          <div className="bounce1"></div>
                          <div className="bounce2"></div>
                          <div className="bounce3"></div>
                        </div>
                      ) : (
                        "확인"
                      )}
                    </button>
                    {errors.verificationCode && <span className="error-message">{errors.verificationCode}</span>}
                  </div>
                )}
              </div>

              <div className="form-row">
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
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="date"
                      id="birthDate"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="date-input"
                    />
                  </div>
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
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder="전화번호"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className={errors.phoneNumber ? "error" : ""}
                    />
                  </div>
                  {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                </div>
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
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    placeholder="주소 (선택사항)"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="back-button" onClick={prevStep}>
                  이전
                </button>
                <button type="submit" className="register-button" disabled={isSubmitting || !emailVerified}>
                  {isSubmitting ? (
                    <div className="spinner">
                      <div className="bounce1"></div>
                      <div className="bounce2"></div>
                      <div className="bounce3"></div>
                    </div>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="login-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>

      <div className="register-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  )
}

export default RegisterPage

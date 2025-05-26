"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import styles from "./RegisterPage.module.css" // CSS 모듈 올바른 import
import { verifyEmailCode, registerUser, requestEmailVerification } from "../../api/auth"
import { useKakaoAuth } from "../../context/AuthContext" // 수정된 import 경로
import KakaoSignupForm from "../../components/KakaoSignupForm/KakaoSignupForm"

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const verificationInputRef = useRef(null)

  // 카카오 회원가입 상태 확인
  const kakaoSignupState = location.state?.kakaoSignup
  const kakaoInfo = location.state?.kakaoInfo

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

  const { startKakaoLogin, isLoading: kakaoLoading, error, setError } = useKakaoAuth()

  // 카카오 회원가입 모드인지 확인
  const isKakaoSignupMode = kakaoSignupState && kakaoInfo

  useEffect(() => {
    let interval = null
    if (timerActive && verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(verificationTimer - 1)
      }, 1000)
    } else if (verificationTimer === 0) {
      setTimerActive(false)
      if (emailVerificationSent && !emailVerified) {
        setEmailVerificationSent(false)
      }
    }
    return () => clearInterval(interval)
  }, [timerActive, verificationTimer, emailVerificationSent, emailVerified])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "phoneNumber") {
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

    validateField(name, name === "phoneNumber" ? formatPhoneNumber(value.replace(/[^0-9]/g, "")) : value)
  }

  const formatPhoneNumber = (value) => {
    if (!value) return value
    const phoneNumber = value.replace(/[^\d]/g, "")

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
        const userData = {
          id: formData.id,
          name: formData.name,
          password: formData.password,
          nickname: formData.nickname,
          email: formData.email,
          birth_date: formData.birthDate || null,
          phone_number: formData.phoneNumber.replace(/-/g, ""),
          address: formData.address || null,
          is_verified: true,
        }

        if (formData.profilePicture) {
          const formDataToSend = new FormData()
          formDataToSend.append("data", JSON.stringify(userData))
          formDataToSend.append("profile_picture", formData.profilePicture)
          await registerUser(formDataToSend)
        } else {
          await registerUser(userData)
        }

        alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.")
        navigate("/login")
      } catch (error) {
        if (error.response && error.response.data) {
          alert(`회원가입 오류: ${error.response.data.detail || "알 수 없는 오류가 발생했습니다."}`)
        } else {
          alert("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // 카카오로 시작하기 버튼 클릭 - 완전 초기화 후 시작
  const handleKakaoLogin = async () => {
    try {
      console.log("=== 카카오로 시작하기 버튼 클릭 - 완전 초기화 시작 ===")

      // 기존 에러 메시지 초기화
      setError(null)

      // 완전 초기화 후 새로운 카카오 로그인 시작 (강제 로그인 모드)
      await startKakaoLogin(true) // forceLogin = true로 매번 새로운 로그인
    } catch (error) {
      console.error("카카오 시작 오류:", error)
      setError("카카오 로그인 시작 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const handleKakaoSignupCancel = () => {
    // 카카오 회원가입 취소 시 일반 회원가입 페이지로
    navigate("/register", { replace: true })
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
        return styles.veryWeak
      case 2:
        return styles.weak
      case 3:
        return styles.medium
      case 4:
        return styles.strong
      case 5:
        return styles.veryStrong
      default:
        return ""
    }
  }

  const sendVerificationCode = async () => {
    if (!formData.email || errors.email) {
      alert("유효한 이메일 주소를 입력해주세요.")
      return
    }

    setIsVerifying(true)

    try {
      setEmailVerificationSent(true)
      setVerificationTimer(180)
      setTimerActive(true)
      alert(`${formData.email}로 인증 코드가 발송되었습니다. 3분 내에 입력해주세요.`)

      if (verificationInputRef.current) {
        verificationInputRef.current.focus()
      }

      await requestEmailVerification(formData.email)
    } catch (error) {
      if (error.response && error.response.data) {
        alert(`인증 코드 발송 오류: ${error.response.data.detail || "알 수 없는 오류가 발생했습니다."}`)
      } else {
        alert("인증 코드 발송 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const verifyCode = async () => {
    if (!formData.verificationCode) {
      setErrors({
        ...errors,
        verificationCode: "인증 코드를 입력해주세요",
      })
      return
    }

    setIsVerifying(true)

    try {
      const response = await verifyEmailCode(formData.email, formData.verificationCode)

      if (response.success) {
        setEmailVerified(true)
        setTimerActive(false)
        alert("이메일 인증이 완료되었습니다.")
      } else {
        setErrors({
          ...errors,
          verificationCode: "인증 코드가 일치하지 않습니다",
        })
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setErrors({
          ...errors,
          verificationCode: error.response.data.detail || "인증 코드가 일치하지 않습니다",
        })
      } else {
        setErrors({
          ...errors,
          verificationCode: "인증 코드 확인 중 오류가 발생했습니다",
        })
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  // 카카오 회원가입 모드인 경우 - 헤더 제거하고 KakaoSignupForm만 렌더링
  if (isKakaoSignupMode) {
    return <KakaoSignupForm kakaoInfo={kakaoInfo} onCancel={handleKakaoSignupCancel} />
  }

  // 일반 회원가입 모드
  return (
    <div className={styles.registerPage}>
      <div className={styles.registerContainer}>
        <div className={styles.registerHeader}>
          <h1 className={styles.registerTitle}>Create Account</h1>
          <p className={styles.registerSubtitle}>패션 가이즈의 회원이 되어 다양한 서비스를 이용해보세요</p>
        </div>

        {/* 에러 메시지 표시 */}
        {error && <div className="error-banner">{error}</div>}

        {currentStep === 1 && (
          <>
            <div className={styles.socialLogin}>
              <button className={styles.kakaoLoginBtn} onClick={handleKakaoLogin} disabled={kakaoLoading}>
                <svg
                  className={styles.kakaoIcon}
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
                {kakaoLoading ? "처리 중..." : "카카오로 시작하기"}
              </button>
            </div>

            <div className={styles.divider}>
              <span>또는</span>
            </div>
          </>
        )}

        <form className={styles.registerForm} onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className={styles.formStep}>
              <div className={styles.formGroup}>
                <div className={styles.inputContainer}>
                  <svg
                    className={styles.inputIcon}
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
                    className={errors.id ? styles.error : ""}
                  />
                </div>
                {errors.id && <span className={styles.errorMessage}>{errors.id}</span>}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.inputContainer}>
                  <svg
                    className={styles.inputIcon}
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
                    className={errors.password ? styles.error : ""}
                  />
                </div>
                {formData.password && (
                  <div className={styles.passwordStrength}>
                    <div className={styles.strengthBars}>
                      <div
                        className={`${styles.strengthBar} ${passwordStrength >= 1 ? getPasswordStrengthClass() : ""}`}
                      ></div>
                      <div
                        className={`${styles.strengthBar} ${passwordStrength >= 2 ? getPasswordStrengthClass() : ""}`}
                      ></div>
                      <div
                        className={`${styles.strengthBar} ${passwordStrength >= 3 ? getPasswordStrengthClass() : ""}`}
                      ></div>
                      <div
                        className={`${styles.strengthBar} ${passwordStrength >= 4 ? getPasswordStrengthClass() : ""}`}
                      ></div>
                      <div
                        className={`${styles.strengthBar} ${passwordStrength >= 5 ? getPasswordStrengthClass() : ""}`}
                      ></div>
                    </div>
                    <span className={`${styles.strengthText} ${getPasswordStrengthClass()}`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                )}
                {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.inputContainer}>
                  <svg
                    className={styles.inputIcon}
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
                    className={errors.confirmPassword ? styles.error : ""}
                  />
                </div>
                {errors.confirmPassword && <span className={styles.errorMessage}>{errors.confirmPassword}</span>}
              </div>

              <button type="button" className={styles.nextButton} onClick={nextStep}>
                다음 단계
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.formStep}>
              <div className={styles.profilePictureSection}>
                <div className={styles.profilePictureContainer} onClick={triggerFileInput}>
                  {previewImage ? (
                    <img
                      src={previewImage || "/placeholder.svg"}
                      alt="프로필 미리보기"
                      className={styles.profilePreview}
                    />
                  ) : (
                    <div className={styles.profilePlaceholder}>
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
                    className={styles.profileInput}
                    ref={fileInputRef}
                  />
                  <span className={styles.profileUploadText}>프로필 사진 선택</span>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.inputContainer}>
                    <svg
                      className={styles.inputIcon}
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
                      className={errors.name ? styles.error : ""}
                    />
                  </div>
                  {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.inputContainer}>
                    <svg
                      className={styles.inputIcon}
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
                      className={errors.nickname ? styles.error : ""}
                    />
                  </div>
                  {errors.nickname && <span className={styles.errorMessage}>{errors.nickname}</span>}
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.emailVerificationContainer}>
                  <div className={styles.inputContainer}>
                    <svg
                      className={styles.inputIcon}
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
                      className={errors.email ? styles.error : ""}
                      disabled={emailVerified}
                    />
                  </div>
                  <button
                    type="button"
                    className={`${styles.verificationButton} ${emailVerified ? styles.verified : ""}`}
                    onClick={sendVerificationCode}
                    disabled={isVerifying || emailVerified || !formData.email || !!errors.email}
                  >
                    {isVerifying ? (
                      <div className={styles.spinnerSmall}>
                        <div className={styles.bounce1}></div>
                        <div className={styles.bounce2}></div>
                        <div className={styles.bounce3}></div>
                      </div>
                    ) : emailVerified ? (
                      <>
                        <svg
                          className={styles.verifiedIcon}
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
                {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}

                {emailVerificationSent && !emailVerified && (
                  <div className={styles.verificationCodeContainer}>
                    <div className={styles.inputContainer}>
                      <svg
                        className={styles.inputIcon}
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
                        className={errors.verificationCode ? styles.error : ""}
                        ref={verificationInputRef}
                      />
                      {timerActive && <span className={styles.verificationTimer}>{formatTime(verificationTimer)}</span>}
                    </div>
                    <button
                      type="button"
                      className={styles.verifyCodeButton}
                      onClick={verifyCode}
                      disabled={isVerifying || !formData.verificationCode}
                    >
                      {isVerifying ? (
                        <div className={styles.spinnerSmall}>
                          <div className={styles.bounce1}></div>
                          <div className={styles.bounce2}></div>
                          <div className={styles.bounce3}></div>
                        </div>
                      ) : (
                        "확인"
                      )}
                    </button>
                    {errors.verificationCode && <span className={styles.errorMessage}>{errors.verificationCode}</span>}
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <div className={styles.inputContainer}>
                    <svg
                      className={styles.inputIcon}
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
                      className={styles.dateInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.inputContainer}>
                    <svg
                      className={styles.inputIcon}
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
                      className={errors.phoneNumber ? styles.error : ""}
                    />
                  </div>
                  {errors.phoneNumber && <span className={styles.errorMessage}>{errors.phoneNumber}</span>}
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.inputContainer}>
                  <svg
                    className={styles.inputIcon}
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

              <div className={styles.formActions}>
                <button type="button" className={styles.backButton} onClick={prevStep}>
                  이전
                </button>
                <button type="submit" className={styles.registerButton} disabled={isSubmitting || !emailVerified}>
                  {isSubmitting ? (
                    <div className={styles.spinner}>
                      <div className={styles.bounce1}></div>
                      <div className={styles.bounce2}></div>
                      <div className={styles.bounce3}></div>
                    </div>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className={styles.loginLink}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>

      <div className={styles.registerDecoration}>
        <div className={`${styles.decorationCircle} ${styles.circle1}`}></div>
        <div className={`${styles.decorationCircle} ${styles.circle2}`}></div>
        <div className={`${styles.decorationCircle} ${styles.circle3}`}></div>
      </div>
    </div>
  )
}

export default RegisterPage

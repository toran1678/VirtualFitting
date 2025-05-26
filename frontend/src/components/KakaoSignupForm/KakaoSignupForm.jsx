"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useKakaoAuth } from "../../context/AuthContext"
import styles from "./KakaoSignupForm.module.css"

const KakaoSignupForm = ({ kakaoInfo, onCancel }) => {
  const navigate = useNavigate()
  const { completeKakaoSignup, isLoading, error, kakaoUserInfo, restartKakaoAuth, authSuccess, clearAuthSuccess } =
    useKakaoAuth()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: kakaoInfo?.email || "",
    birthDate: "",
    address: "",
    customNickname: kakaoInfo?.nickname || "",
    profilePicture: null, // 파일 객체 저장
  })

  const [errors, setErrors] = useState({})
  const [previewImage, setPreviewImage] = useState(kakaoInfo?.profile_picture || null)

  // authSuccess 상태 감지하여 네비게이션 처리
  useEffect(() => {
    if (authSuccess?.shouldNavigateToMain && authSuccess?.type === "kakao_signup") {
      console.log("회원가입 성공 - 메인 페이지로 이동:", authSuccess.message)
      alert(authSuccess.message)

      setTimeout(() => {
        clearAuthSuccess()
        navigate("/", { replace: true })
      }, 1000)
    }
  }, [authSuccess, navigate, clearAuthSuccess])

  useEffect(() => {
    if (error) {
      console.error("KakaoSignupForm 에러:", error)
    }
  }, [error])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "phoneNumber") {
      // 전화번호 포맷팅
      const numericValue = value.replace(/[^0-9]/g, "")
      const formattedValue = formatPhoneNumber(numericValue)
      setFormData((prev) => ({ ...prev, [name]: formattedValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // 실시간 유효성 검사
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
      case "name":
        if (!value) {
          newErrors.name = "이름을 입력해주세요"
        } else {
          delete newErrors.name
        }
        break
      case "phoneNumber":
        if (!value) {
          newErrors.phoneNumber = "전화번호를 입력해주세요"
        } else if (!/^010-\d{4}-\d{4}$/.test(value)) {
          newErrors.phoneNumber = "올바른 전화번호 형식이 아닙니다"
        } else {
          delete newErrors.phoneNumber
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
      // 파일 객체를 formData에 저장
      setFormData((prev) => ({ ...prev, profilePicture: file }))

      // 이미지 미리보기
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)

      console.log("프로필 사진 선택됨:", file.name, file.size, "bytes")
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log("=== 카카오 회원가입 시작 ===")
    console.log("kakaoInfo prop:", kakaoInfo)
    console.log("kakaoUserInfo from context:", kakaoUserInfo)

    // 카카오 정보 확인 - 여러 소스에서 시도
    let finalKakaoInfo = kakaoInfo || kakaoUserInfo

    // 세션/로컬 스토리지에서도 시도
    if (!finalKakaoInfo?.id && !finalKakaoInfo?.kakao_id) {
      const savedKakaoInfo = sessionStorage.getItem("kakao_user_info") || localStorage.getItem("temp_kakao_info")
      if (savedKakaoInfo) {
        try {
          finalKakaoInfo = JSON.parse(savedKakaoInfo)
          console.log("저장소에서 카카오 정보 복구:", finalKakaoInfo)
        } catch (error) {
          console.error("저장소에서 카카오 정보 복구 실패:", error)
        }
      }
    }

    if (!finalKakaoInfo?.id && !finalKakaoInfo?.kakao_id) {
      const errorMsg = "카카오 정보가 없습니다. 다시 로그인해주세요."
      console.error(errorMsg)
      console.error("Available kakaoInfo:", finalKakaoInfo)
      setErrors({ general: errorMsg })

      // 3초 후 새로운 인증 시작
      setTimeout(() => {
        restartKakaoAuth()
      }, 3000)
      return
    }

    // 필수 필드 검증
    const requiredFields = ["name", "phoneNumber"]
    const newErrors = {}

    requiredFields.forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = "필수 입력 항목입니다"
      }
    })

    // 전화번호 형식 검증
    if (formData.phoneNumber && !/^010-\d{4}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "올바른 전화번호 형식이 아닙니다"
    }

    if (Object.keys(newErrors).length > 0) {
      console.error("유효성 검증 실패:", newErrors)
      setErrors(newErrors)
      return
    }

    try {
      // 회원가입 데이터 준비
      const signupData = {
        kakao_id: finalKakaoInfo.id || finalKakaoInfo.kakao_id, // 둘 다 확인
        name: formData.name.trim(),
        phone_number: formData.phoneNumber,
        email: formData.email || finalKakaoInfo?.email || null,
        birth_date: formData.birthDate || null,
        address: formData.address || null,
        custom_nickname: formData.customNickname || null,
      }

      console.log("=== 최종 회원가입 데이터 ===")
      console.log("signupData:", JSON.stringify(signupData, null, 2))
      console.log("profilePicture:", formData.profilePicture)

      // 프로필 사진과 함께 회원가입 요청
      const result = await completeKakaoSignup(signupData, formData.profilePicture)

      console.log("=== 회원가입 결과 ===")
      console.log(result)

      // 성공 처리는 authSuccess useEffect에서 처리됨
      if (!result?.user && result?.error) {
        console.error("회원가입 실패:", result.error)
        setErrors({ general: result.error })
      } else if (!result?.user) {
        console.error("예상치 못한 응답:", result)
        setErrors({ general: "회원가입에 실패했습니다." })
      }
    } catch (err) {
      console.error("회원가입 처리 오류:", err)

      // 에러 메시지를 문자열로 변환
      let errorMessage = "회원가입 처리 중 오류가 발생했습니다."

      if (err.response?.status === 429) {
        errorMessage = "카카오 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
      } else if (err.response?.data?.detail) {
        errorMessage =
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
      } else if (err.message) {
        errorMessage = err.message
      }

      setErrors({ general: errorMessage })
    }
  }

  // Rate Limit 에러인지 확인
  const isRateLimitError = error && (error.includes("과부하") || error.includes("rate limit") || error.includes("429"))

  return (
    <div className={styles.kakaoSignupPage}>
      <div className={styles.kakaoSignupContainer}>
        <div className={styles.kakaoSignupHeader}>
          <h1 className={styles.kakaoSignupTitle}>카카오 회원가입</h1>
          <p className={styles.kakaoSignupSubtitle}>추가 정보를 입력하여 회원가입을 완료해주세요</p>
        </div>

        {/* 카카오 정보 표시 */}
        <div className={styles.kakaoInfoSection}>
          <h3 className={styles.kakaoInfoTitle}>카카오 계정 정보</h3>
          <div className={styles.kakaoProfileDisplay}>
            <img
              src={kakaoInfo?.profile_picture || "/placeholder.svg?height=70&width=70&query=kakao profile"}
              alt="카카오 프로필"
              className={styles.kakaoProfileImg}
            />
            <div className={styles.kakaoUserDetails}>
              <div className={styles.kakaoDetailRow}>
                <span className={styles.kakaoDetailLabel}>닉네임:</span>
                <span className={styles.kakaoDetailValue}>{kakaoInfo?.nickname || "없음"}</span>
              </div>
              <div className={styles.kakaoDetailRow}>
                <span className={styles.kakaoDetailLabel}>이메일:</span>
                <span className={styles.kakaoDetailValue}>{kakaoInfo?.email || "제공되지 않음"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 추가 정보 입력 폼 */}
        <form className={styles.kakaoSignupForm} onSubmit={handleSubmit}>
          {/* 에러 메시지 표시 */}
          {(error || errors.general) && (
            <div className={styles.errorBanner}>
              {typeof (error || errors.general) === "string"
                ? error || errors.general
                : JSON.stringify(error || errors.general)}

              {/* Rate Limit 에러인 경우 추가 안내 */}
              {isRateLimitError && (
                <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#ff9800" }}>
                  💡 카카오 API 사용량이 일시적으로 초과되었습니다. 5-10분 후 다시 시도해주세요.
                </div>
              )}

              {(error || errors.general)?.includes?.("카카오 정보") && (
                <button
                  type="button"
                  onClick={restartKakaoAuth}
                  style={{ marginLeft: "10px", padding: "5px 10px", fontSize: "12px" }}
                >
                  새로운 인증 시작
                </button>
              )}
            </div>
          )}

          {/* 프로필 사진 업로드 */}
          <div className={styles.profilePictureSection}>
            <div className={styles.profilePictureContainer} onClick={triggerFileInput}>
              {previewImage ? (
                <img src={previewImage || "/placeholder.svg"} alt="프로필 미리보기" className={styles.profilePreview} />
              ) : (
                <div className={styles.profilePlaceholder}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="50"
                    height="50"
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

          <div className={styles.formStep}>
            {/* 이름과 전화번호를 한 줄에 배치 */}
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
                    placeholder="이름 (필수)"
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
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="전화번호 (필수)"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={errors.phoneNumber ? styles.error : ""}
                  />
                </div>
                {errors.phoneNumber && <span className={styles.errorMessage}>{errors.phoneNumber}</span>}
              </div>
            </div>

            {/* 이메일 (카카오에서 가져온 값, 비활성화) */}
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
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="이메일 (카카오 계정)"
                  value={formData.email}
                  disabled
                  className={styles.kakaoEmailInput}
                />
              </div>
              <small className={styles.kakaoEmailNote}>카카오 계정의 이메일이 자동으로 사용됩니다.</small>
            </div>

            {/* 닉네임 (선택) */}
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
                  id="customNickname"
                  name="customNickname"
                  placeholder="닉네임 (선택사항)"
                  value={formData.customNickname}
                  onChange={handleChange}
                />
              </div>
              <small className={styles.fieldHint}>비워두면 카카오 닉네임을 사용합니다.</small>
            </div>

            {/* 생년월일 (선택) */}
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
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
                </svg>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  placeholder="생년월일 (선택사항)"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 주소 (선택) */}
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

            {/* 버튼 영역 */}
            <div className={styles.formActions}>
              <button type="button" className={styles.backButton} onClick={onCancel} disabled={isLoading}>
                취소
              </button>
              <button type="submit" className={styles.registerButton} disabled={isLoading || isRateLimitError}>
                {isLoading ? (
                  <div className={styles.spinner}>
                    <div className={styles.bounce1}></div>
                    <div className={styles.bounce2}></div>
                    <div className={styles.bounce3}></div>
                  </div>
                ) : isRateLimitError ? (
                  "잠시 후 다시 시도"
                ) : (
                  "회원가입 완료"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 장식용 원들 */}
      <div className={styles.kakaoSignupDecoration}>
        <div className={`${styles.decorationCircle} ${styles.circle1}`}></div>
        <div className={`${styles.decorationCircle} ${styles.circle2}`}></div>
        <div className={`${styles.decorationCircle} ${styles.circle3}`}></div>
      </div>
    </div>
  )
}

export default KakaoSignupForm

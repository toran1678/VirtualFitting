"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn } from "../../api/auth"
import {
  getMyProfile,
  updateProfile,
  changePassword,
  updatePrivacySettings,
  getProfileImageUrl,
} from "../../api/profile"
import styles from "./ProfileEditPage.module.css"
import { User, Lock, Shield, Camera, Eye, EyeOff, Check, X } from "lucide-react"

const ProfileEditPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("basic")
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState("")

  // 기본 정보 상태
  const [basicInfo, setBasicInfo] = useState({
    profileImage: null,
    profileImageFile: null,
    nickname: "",
    name: "",
    email: "",
    phone_number: "",
    birth_date: "",
    address: "",
  })

  // 비밀번호 상태
  const [passwordInfo, setPasswordInfo] = useState({
    newPassword: "",
    confirmPassword: "",
    showNewPassword: false,
    showConfirmPassword: false,
  })

  // 프라이버시 설정 상태
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false,
  })

  // 비밀번호 강도 계산
  const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, text: "", color: "" }

    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    score = Object.values(checks).filter(Boolean).length

    if (score <= 2) return { score, text: "약함", color: "#ef4444" }
    if (score <= 3) return { score, text: "보통", color: "#f59e0b" }
    if (score <= 4) return { score, text: "강함", color: "#10b981" }
    return { score, text: "매우 강함", color: "#059669" }
  }

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const phoneNumber = value.replace(/[^\d]/g, "")

    // 길이에 따라 포맷팅
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`
    }
  }

  // 전화번호 입력 핸들러
  const handlePhoneNumberChange = (value) => {
    const formattedValue = formatPhoneNumber(value)
    setBasicInfo((prev) => ({
      ...prev,
      phone_number: formattedValue,
    }))
    setHasChanges(true)
  }

  const passwordStrength = calculatePasswordStrength(passwordInfo.newPassword)

  // 프로필 데이터 로드
  const loadProfileData = async () => {
    try {
      setLoading(true)
      setError("")

      const profileData = await getMyProfile()
      console.log("프로필 데이터 로드:", profileData)

      setUserData(profileData)

      // 기본 정보 설정
      setBasicInfo({
        profileImage: profileData.profile_picture ? getProfileImageUrl(profileData.profile_picture) : null,
        profileImageFile: null,
        nickname: profileData.nickname || "",
        name: profileData.name || "",
        email: profileData.email || "",
        phone_number: profileData.phone_number || "",
        birth_date: profileData.birth_date || "",
        address: profileData.address || "",
      })

      // 프라이버시 설정
      setPrivacySettings({
        isPrivate: profileData.is_private || false,
      })
    } catch (error) {
      console.error("프로필 데이터 로드 실패:", error)
      setError("프로필 정보를 불러오는 중 오류가 발생했습니다.")

      // 401 에러인 경우 로그인 페이지로 리다이렉트
      if (error.response?.status === 401) {
        alert("로그인이 필요합니다.")
        navigate("/login")
      }
    } finally {
      setLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      await loadProfileData()
    }

    checkAuth()
  }, [navigate])

  // 프로필 이미지 업로드 핸들러
  const handleProfileImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.")
        return
      }

      // 파일 형식 체크
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
      if (!allowedTypes.includes(file.type)) {
        alert("JPG, PNG 파일만 업로드 가능합니다.")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setBasicInfo((prev) => ({
          ...prev,
          profileImage: e.target.result,
          profileImageFile: file,
        }))
        setHasChanges(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // 기본 정보 변경 핸들러
  const handleBasicInfoChange = (field, value) => {
    setBasicInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
    setHasChanges(true)
  }

  // 비밀번호 변경 핸들러
  const handlePasswordChange = (field, value) => {
    setPasswordInfo((prev) => ({
      ...prev,
      [field]: value,
    }))

    // 비밀번호가 입력되면 변경사항으로 표시
    if (field === "newPassword" && value) {
      setHasChanges(true)
    }
  }

  // 프라이버시 설정 변경 핸들러
  const handlePrivacyChange = (field, value) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [field]: value,
    }))
    setHasChanges(true)
  }

  // 저장 핸들러
  const handleSave = async () => {
    setSaving(true)
    setError("")

    try {
      // 기본 정보 업데이트
      if (activeTab === "basic") {
        const profileUpdateData = {
          nickname: basicInfo.nickname,
          name: basicInfo.name,
          email: basicInfo.email,
          phone_number: basicInfo.phone_number,
          birth_date: basicInfo.birth_date,
          address: basicInfo.address,
        }

        console.log("프로필 업데이트 데이터:", profileUpdateData)
        console.log("프로필 이미지 파일:", basicInfo.profileImageFile)

        const result = await updateProfile(profileUpdateData, basicInfo.profileImageFile)
        console.log("프로필 업데이트 결과:", result)

        if (result.success) {
          alert("프로필이 성공적으로 수정되었습니다!")
          setHasChanges(false)

          // 프로필 이미지 파일 상태 초기화
          setBasicInfo((prev) => ({
            ...prev,
            profileImageFile: null,
          }))

          // 업데이트된 데이터로 상태 갱신
          if (result.user) {
            setUserData(result.user)
            setBasicInfo((prev) => ({
              ...prev,
              profileImage: result.user.profile_picture
                ? getProfileImageUrl(result.user.profile_picture)
                : prev.profileImage,
            }))
          }
        }
      }

      // 비밀번호 변경
      if (activeTab === "security" && passwordInfo.newPassword) {
        if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
          alert("비밀번호가 일치하지 않습니다.")
          return
        }

        if (passwordInfo.newPassword.length < 8) {
          alert("비밀번호는 최소 8자 이상이어야 합니다.")
          return
        }

        console.log("비밀번호 변경 요청")
        const result = await changePassword(passwordInfo.newPassword)
        console.log("비밀번호 변경 결과:", result)

        if (result.success) {
          alert("비밀번호가 성공적으로 변경되었습니다!")
          setPasswordInfo({
            newPassword: "",
            confirmPassword: "",
            showNewPassword: false,
            showConfirmPassword: false,
          })
          setHasChanges(false)
        }
      }

      // 프라이버시 설정 변경
      if (activeTab === "privacy") {
        console.log("프라이버시 설정 변경:", privacySettings.isPrivate)
        const result = await updatePrivacySettings(privacySettings.isPrivate)
        console.log("프라이버시 설정 변경 결과:", result)

        if (result.success) {
          alert("프라이버시 설정이 성공적으로 변경되었습니다!")
          setHasChanges(false)
        }
      }
    } catch (error) {
      console.error("저장 실패:", error)

      let errorMessage = "저장 중 오류가 발생했습니다."

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // 취소 핸들러
  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm("변경사항이 저장되지 않습니다. 정말 나가시겠습니까?")) {
        navigate("/mypage")
      }
    } else {
      navigate("/mypage")
    }
  }

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>기본 정보</h3>

            {/* 에러 메시지 */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* 프로필 이미지 */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>프로필 이미지</label>
              <div className={styles.profileImageSection}>
                <div className={styles.profileImageContainer}>
                  {basicInfo.profileImage ? (
                    <img
                      src={basicInfo.profileImage || "/placeholder.svg"}
                      alt="프로필"
                      className={styles.profileImage}
                    />
                  ) : (
                    <div className={styles.profilePlaceholder}>
                      <User size={40} />
                    </div>
                  )}
                </div>

                <div className={styles.imageUploadActions}>
                  <button
                    type="button"
                    className={styles.imageUploadButton}
                    onClick={() => document.getElementById("profile-image-input").click()}
                    title="프로필 이미지 변경"
                  >
                    <Camera size={18} />
                    이미지 변경
                  </button>
                  <div className={styles.imageUploadInfo}>
                    <p>JPG, PNG 파일만 업로드 가능</p>
                    <p>최대 파일 크기: 5MB</p>
                  </div>
                </div>

                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleProfileImageUpload}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* 필수 정보 */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  닉네임 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={basicInfo.nickname}
                  onChange={(e) => handleBasicInfoChange("nickname", e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={50}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  이름 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={basicInfo.name}
                  onChange={(e) => handleBasicInfoChange("name", e.target.value)}
                  placeholder="이름을 입력하세요"
                  maxLength={100}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  이메일 <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={basicInfo.email}
                  onChange={(e) => handleBasicInfoChange("email", e.target.value)}
                  placeholder="이메일을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  전화번호 <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={basicInfo.phone_number}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="010-1111-1111"
                  maxLength={13}
                />
              </div>
            </div>

            {/* 선택 정보 */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>생년월일</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={basicInfo.birth_date}
                  onChange={(e) => handleBasicInfoChange("birth_date", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>주소</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={basicInfo.address}
                  onChange={(e) => handleBasicInfoChange("address", e.target.value)}
                  placeholder="주소를 입력하세요"
                />
              </div>
            </div>
          </div>
        )

      case "security":
        return (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>보안 설정</h3>

            {/* 에러 메시지 */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>새 비밀번호</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordInfo.showNewPassword ? "text" : "password"}
                  className={styles.formInput}
                  value={passwordInfo.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  placeholder="새 비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => handlePasswordChange("showNewPassword", !passwordInfo.showNewPassword)}
                >
                  {passwordInfo.showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordInfo.newPassword && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthBar}>
                    <div
                      className={styles.strengthFill}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>비밀번호 확인</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordInfo.showConfirmPassword ? "text" : "password"}
                  className={`${styles.formInput} ${
                    passwordInfo.confirmPassword && passwordInfo.newPassword !== passwordInfo.confirmPassword
                      ? styles.inputError
                      : ""
                  }`}
                  value={passwordInfo.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => handlePasswordChange("showConfirmPassword", !passwordInfo.showConfirmPassword)}
                >
                  {passwordInfo.showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordInfo.confirmPassword && (
                <div className={styles.passwordMatch}>
                  {passwordInfo.newPassword === passwordInfo.confirmPassword ? (
                    <span className={styles.matchSuccess}>
                      <Check size={16} /> 비밀번호가 일치합니다
                    </span>
                  ) : (
                    <span className={styles.matchError}>
                      <X size={16} /> 비밀번호가 일치하지 않습니다
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={styles.passwordRequirements}>
              <h4>비밀번호 요구사항</h4>
              <ul>
                <li>최소 8자 이상</li>
                <li>영문 대소문자 포함</li>
                <li>숫자 포함</li>
                <li>특수문자 포함 권장</li>
              </ul>
            </div>
          </div>
        )

      case "privacy":
        return (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>프라이버시 설정</h3>

            {/* 에러 메시지 */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.settingGroup}>
              <h4 className={styles.settingGroupTitle}>계정 공개 설정</h4>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel}>비공개 계정</label>
                  <p className={styles.settingDescription}>
                    비공개 계정으로 설정하면 팔로워만 내 게시물을 볼 수 있습니다.
                  </p>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={privacySettings.isPrivate}
                    onChange={(e) => handlePrivacyChange("isPrivate", e.target.checked)}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className={styles.profileEditPage}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>프로필 정보를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.profileEditPage}>
      <Header />

      <main className={styles.profileEditMain}>
        <div className={styles.container}>
          <div className={styles.pageContainer}>
            {/* 페이지 헤더 */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>프로필 수정</h1>
              <div className={styles.headerActions}>
                <button className={styles.cancelButton} onClick={handleCancel}>
                  취소
                </button>
                <button className={styles.saveButton} onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className={styles.tabNavigation}>
              <button
                className={`${styles.tabButton} ${activeTab === "basic" ? styles.active : ""}`}
                onClick={() => setActiveTab("basic")}
              >
                <User size={20} />
                기본 정보
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === "security" ? styles.active : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <Lock size={20} />
                보안 설정
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === "privacy" ? styles.active : ""}`}
                onClick={() => setActiveTab("privacy")}
              >
                <Shield size={20} />
                프라이버시
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            {renderTabContent()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ProfileEditPage

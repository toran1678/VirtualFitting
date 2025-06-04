"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import ImageUploader from "../../components/ImageUploader/ImageUploader"
import { createFeed } from "../../api/feeds" // 새로 작성한 API 사용
import styles from "./CreateFeedPage.module.css"

const CreateFeedPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth() // AuthContext 사용

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  })
  const [images, setImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved") // 'saved', 'saving', 'error'
  const [error, setError] = useState(null)

  // 사용자 인증 상태 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
      alert("로그인이 필요한 서비스입니다.")
      navigate("/login", { state: { from: "/create-feed" } })
    }
  }, [authLoading, isAuthenticated, navigate])

  // 폼 검증
  const isFormValid = formData.title.trim() && formData.content.trim()

  // 입력 핸들러
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null) // 입력 시 에러 초기화
  }

  // 임시저장 (로컬스토리지) - 이미지 포함
  const saveToLocalStorage = useCallback(() => {
    try {
      setAutoSaveStatus("saving")

      // 이미지 데이터 준비 (파일 객체는 저장할 수 없으므로 URL과 메타데이터만 저장)
      const imageData = images.map((img) => ({
        id: img.id,
        preview: img.preview,
        order: img.order,
        // 파일 객체는 저장할 수 없으므로 제외
        // 대신 파일명과 타입 같은 메타데이터만 저장
        fileName: img.file?.name || "",
        fileType: img.file?.type || "",
        fileSize: img.file?.size || 0,
      }))

      const dataToSave = {
        formData,
        images: imageData,
        timestamp: Date.now(),
        userId: user?.user_id, // 사용자별 임시저장
      }

      localStorage.setItem(`draft_feed_${user?.user_id}`, JSON.stringify(dataToSave))
      setTimeout(() => setAutoSaveStatus("saved"), 500)
    } catch (error) {
      console.error("임시저장 실패:", error)
      setAutoSaveStatus("error")
    }
  }, [formData, images, user?.user_id])

  // 임시저장된 데이터 불러오기 (이미지 포함)
  useEffect(() => {
    if (!user?.user_id) return

    try {
      const savedDraft = localStorage.getItem(`draft_feed_${user.user_id}`)
      if (savedDraft) {
        const { formData: savedFormData, images: savedImages, timestamp } = JSON.parse(savedDraft)

        // 24시간 이내의 데이터만 복원
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setFormData(savedFormData)

          // 이미지 데이터 복원 (미리보기 URL만 복원 가능)
          if (savedImages && savedImages.length > 0) {
            const restoredImages = savedImages.map((img) => ({
              ...img,
              // 파일 객체는 복원할 수 없으므로 null로 설정
              file: null,
              // 미리보기 URL은 그대로 사용
              isRestored: true, // 복원된 이미지 표시
            }))

            setImages(restoredImages)
          }
        } else {
          localStorage.removeItem(`draft_feed_${user.user_id}`)
        }
      }
    } catch (error) {
      console.error("임시저장 데이터 불러오기 실패:", error)
    }
  }, [user?.user_id])

  // 자동 임시저장 (3초마다)
  useEffect(() => {
    if (user?.user_id && (formData.title || formData.content || images.length > 0)) {
      const timer = setTimeout(saveToLocalStorage, 3000)
      return () => clearTimeout(timer)
    }
  }, [formData, images, saveToLocalStorage, user?.user_id])

  // 뒤로가기
  const handleBack = () => {
    if (formData.title || formData.content || images.length > 0) {
      if (window.confirm("작성 중인 내용이 있습니다. 정말 나가시겠습니까?")) {
        navigate(-1)
      }
    } else {
      navigate(-1)
    }
  }

  // 임시저장 버튼
  const handleSaveDraft = () => {
    saveToLocalStorage()
    alert("임시저장되었습니다.")
  }

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid) {
      setError("제목과 내용을 모두 입력해주세요.")
      return
    }

    // 복원된 이미지가 있는지 확인
    const hasRestoredImages = images.some((img) => img.isRestored)
    if (hasRestoredImages) {
      if (!window.confirm("임시저장된 이미지는 파일 정보가 없어 업로드할 수 없습니다. 계속 진행하시겠습니까?")) {
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 복원된 이미지 제외하고 실제 파일이 있는 이미지만 필터링
      const uploadableImages = images.filter((img) => img.file)

      // 백엔드 API 호출
      await createFeed(formData, uploadableImages)

      // 임시저장 데이터 삭제
      localStorage.removeItem(`draft_feed_${user.user_id}`)

      alert("피드가 성공적으로 작성되었습니다!")
      navigate("/feed") // 피드 목록 페이지로 이동
    } catch (error) {
      console.error("피드 작성 실패:", error)

      // 에러 메시지 처리
      let errorMessage = "피드 작성 중 오류가 발생했습니다."

      if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다. 다시 로그인해주세요."
        navigate("/login", { state: { from: "/create-feed" } })
        return
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 사이드바 렌더링
  const renderSidebar = () => (
    <aside className={styles.rightSidebar}>
      {/* 사용자 정보 */}
      {user && (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user.profile_picture ? (
              <img src={user.profile_picture || "/placeholder.svg"} alt={user.nickname} />
            ) : (
              <span>{user.nickname?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <div className={styles.userDetails}>
            <h4>{user.nickname}</h4>
            <span>@{user.id}</span>
          </div>
        </div>
      )}

      {/* 임시저장 상태 */}
      <div className={`${styles.autoSaveStatus} ${styles[autoSaveStatus]}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {autoSaveStatus === "saved" && <path d="M20 6L9 17l-5-5" />}
          {autoSaveStatus === "saving" && <circle cx="12" cy="12" r="10" />}
          {autoSaveStatus === "error" && <path d="M12 8v4M12 16h.01" />}
        </svg>
        {autoSaveStatus === "saved" && "자동 저장됨"}
        {autoSaveStatus === "saving" && "저장 중..."}
        {autoSaveStatus === "error" && "저장 실패"}
      </div>

      {/* 작성 팁 */}
      <div className={styles.sidebarSection}>
        <h3 className={styles.sidebarTitle}>작성 팁</h3>
        <div className={styles.tipsList}>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>매력적인 제목으로 관심을 끌어보세요</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>고화질 이미지를 사용하면 더 좋은 반응을 얻을 수 있어요</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>코디 포인트나 브랜드 정보를 함께 공유해보세요</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>해시태그를 활용해 더 많은 사람들에게 노출시키세요</span>
          </div>
        </div>
      </div>

      {/* 임시저장 버튼 */}
      <button className={`${styles.actionButton} ${styles.secondaryButton}`} onClick={handleSaveDraft}>
        임시저장
      </button>
    </aside>
  )

  // 로딩 중이거나 인증되지 않은 경우
  if (authLoading || !isAuthenticated) {
    return (
      <div className={styles.createFeedContainer}>
        <Header />
        <div className={styles.layoutContainer}>
          <div className={styles.loadingContainer}>
            <p>로딩 중...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.createFeedContainer}>
      <Header />
      <div className={styles.layoutContainer}>
        {/* 왼쪽 빈 공간 */}
        <div className={styles.leftSpacer}></div>

        {/* 메인 작성 영역 */}
        <main className={styles.createFeedContent}>
          {/* 페이지 헤더 */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>피드 작성</h1>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              돌아가기
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {/* 작성 폼 */}
          <form className={styles.createForm} onSubmit={handleSubmit}>
            {/* 제목 입력 */}
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>제목 *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="피드 제목을 입력하세요"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  maxLength={50}
                />
                <div
                  className={`${styles.characterCount} ${
                    formData.title.length > 40 ? (formData.title.length > 50 ? styles.error : styles.warning) : ""
                  }`}
                >
                  {formData.title.length}/50
                </div>
              </div>
            </div>

            {/* 내용 입력 */}
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>내용 *</label>
                <textarea
                  className={`${styles.formInput} ${styles.formTextarea}`}
                  placeholder="어떤 스타일인지, 어디서 구매했는지, 코디 팁 등을 자유롭게 공유해보세요!"
                  value={formData.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  maxLength={2000}
                />
                <div
                  className={`${styles.characterCount} ${
                    formData.content.length > 1800
                      ? formData.content.length > 2000
                        ? styles.error
                        : styles.warning
                      : ""
                  }`}
                >
                  {formData.content.length}/2000
                </div>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <ImageUploader images={images} onImagesChange={setImages} maxImages={10} />

            {/* 폼 액션 버튼 */}
            <div className={styles.formActions}>
              <button type="button" className={`${styles.actionButton} ${styles.secondaryButton}`} onClick={handleBack}>
                취소
              </button>
              <button
                type="submit"
                className={`${styles.actionButton} ${styles.primaryButton}`}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? "작성 중..." : "피드 작성"}
              </button>
            </div>
          </form>
        </main>

        {/* 오른쪽 사이드바 */}
        {renderSidebar()}
      </div>
      <Footer />
    </div>
  )
}

export default CreateFeedPage

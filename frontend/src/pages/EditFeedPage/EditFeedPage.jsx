"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import ImageUploader from "../../components/ImageUploader/ImageUploader"
import { getFeedById, updateFeed } from "../../api/feeds"
import { getFeedImageUrl } from "../../utils/imageUtils"
import styles from "./EditFeedPage.module.css"

const EditFeedPage = () => {
  const { feedId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  })
  const [images, setImages] = useState([])
  const [originalFeed, setOriginalFeed] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // 피드 데이터 로드
  useEffect(() => {
    const loadFeedData = async () => {
      if (!feedId) {
        setError("피드 ID가 없습니다.")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const feedData = await getFeedById(feedId)
        console.log("로드된 피드 데이터:", feedData)

        // 권한 확인 - 작성자만 수정 가능
        if (!user || feedData.user_id !== user.user_id) {
          setError("이 피드를 수정할 권한이 없습니다.")
          setIsLoading(false)
          return
        }

        setOriginalFeed(feedData)
        setFormData({
          title: feedData.title || "",
          content: feedData.content || "",
        })

        // 기존 이미지들을 images 배열로 변환
        if (feedData.images && feedData.images.length > 0) {
          const existingImages = feedData.images.map((img, index) => ({
            id: img.id || `existing_${index}`,
            preview: getFeedImageUrl(img.image_url),
            order: img.image_order || index + 1,
            isExisting: true, // 기존 이미지 표시
            imageId: img.id,
            imageUrl: img.image_url,
          }))
          setImages(existingImages)
        }
      } catch (err) {
        console.error("피드 데이터 로드 실패:", err)
        if (err.response?.status === 404) {
          setError("존재하지 않는 피드입니다.")
        } else if (err.response?.status === 403) {
          setError("이 피드를 수정할 권한이 없습니다.")
        } else {
          setError("피드 데이터를 불러오는 중 오류가 발생했습니다.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && user) {
      loadFeedData()
    }
  }, [feedId, isAuthenticated, user])

  // 사용자 인증 상태 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      alert("로그인이 필요한 서비스입니다.")
      navigate("/login", { state: { from: `/feed/${feedId}/edit` } })
    }
  }, [authLoading, isAuthenticated, navigate, feedId])

  // 폼 검증
  const isFormValid = formData.title.trim() && formData.content.trim()

  // 입력 핸들러
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  // 뒤로가기
  const handleBack = () => {
    const hasChanges =
      formData.title !== (originalFeed?.title || "") ||
      formData.content !== (originalFeed?.content || "") ||
      images.length !== (originalFeed?.images?.length || 0)

    if (hasChanges) {
      if (window.confirm("수정 중인 내용이 있습니다. 정말 나가시겠습니까?")) {
        navigate(`/feed/${feedId}`)
      }
    } else {
      navigate(`/feed/${feedId}`)
    }
  }

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid) {
      setError("제목과 내용을 모두 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 새로 업로드할 이미지만 필터링 (기존 이미지 제외)
      const newImages = images.filter((img) => img.file && !img.isExisting)

      console.log("수정 요청 데이터:", {
        formData,
        newImages: newImages.length,
        totalImages: images.length,
      })

      // 백엔드 API 호출
      await updateFeed(feedId, formData, newImages)

      alert("피드가 성공적으로 수정되었습니다!")
      navigate(`/feed/${feedId}`)
    } catch (error) {
      console.error("피드 수정 실패:", error)

      let errorMessage = "피드 수정 중 오류가 발생했습니다."

      if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다. 다시 로그인해주세요."
        navigate("/login", { state: { from: `/feed/${feedId}/edit` } })
        return
      } else if (error.response?.status === 403) {
        errorMessage = "이 피드를 수정할 권한이 없습니다."
      } else if (error.response?.status === 404) {
        errorMessage = "존재하지 않는 피드입니다."
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

      {/* 수정 안내 */}
      <div className={styles.sidebarSection}>
        <h3 className={styles.sidebarTitle}>수정 안내</h3>
        <div className={styles.tipsList}>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>제목과 내용을 자유롭게 수정할 수 있습니다</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>기존 이미지는 유지되며, 새 이미지를 추가할 수 있습니다</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>이미지 순서는 드래그로 변경 가능합니다</span>
          </div>
          <div className={styles.tipItem}>
            <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
            </svg>
            <span>수정 후 저장하면 즉시 반영됩니다</span>
          </div>
        </div>
      </div>

      {/* 원본 피드 정보 */}
      {originalFeed && (
        <div className={styles.sidebarSection}>
          <h3 className={styles.sidebarTitle}>원본 정보</h3>
          <div className={styles.originalInfo}>
            <p className={styles.originalDate}>
              작성일: {new Date(originalFeed.created_at).toLocaleDateString("ko-KR")}
            </p>
            {originalFeed.updated_at && originalFeed.updated_at !== originalFeed.created_at && (
              <p className={styles.originalDate}>
                수정일: {new Date(originalFeed.updated_at).toLocaleDateString("ko-KR")}
              </p>
            )}
            <p className={styles.originalStats}>
              좋아요 {originalFeed.like_count || 0}개 · 댓글 {originalFeed.comment_count || 0}개
            </p>
          </div>
        </div>
      )}
    </aside>
  )

  // 로딩 중
  if (authLoading || isLoading) {
    return (
      <div className={styles.editFeedContainer}>
        <Header />
        <div className={styles.layoutContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>피드 정보를 불러오는 중...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러 상태
  if (error && !originalFeed) {
    return (
      <div className={styles.editFeedContainer}>
        <Header />
        <div className={styles.layoutContainer}>
          <div className={styles.errorContainer}>
            <h2>오류가 발생했습니다</h2>
            <p>{error}</p>
            <button className={styles.backButton} onClick={() => navigate("/feed")}>
              피드 목록으로 돌아가기
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={styles.editFeedContainer}>
        <Header />
        <div className={styles.layoutContainer}>
          <div className={styles.loadingContainer}>
            <p>로그인 확인 중...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.editFeedContainer}>
      <Header />
      <div className={styles.layoutContainer}>
        {/* 왼쪽 빈 공간 */}
        <div className={styles.leftSpacer}></div>

        {/* 메인 수정 영역 */}
        <main className={styles.editFeedContent}>
          {/* 페이지 헤더 */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>피드 수정</h1>
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

          {/* 수정 폼 */}
          <form className={styles.editForm} onSubmit={handleSubmit}>
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
                {isSubmitting ? "수정 중..." : "피드 수정"}
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

export default EditFeedPage

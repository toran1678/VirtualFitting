"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import ImageUploader from "../../components/ImageUploader/ImageUploader"
import { createFeed } from "../../api/feeds" // 새로 작성한 API 사용
import { proxyImage } from "../../api/imageProxy"
import styles from "./CreateFeedPage.module.css"

const CreateFeedPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, loading: authLoading } = useAuth() // AuthContext 사용

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  })
  const [images, setImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 사용자 인증 상태 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
      alert("로그인이 필요한 서비스입니다.")
      navigate("/login", { state: { from: "/create-feed" } })
    }
  }, [authLoading, isAuthenticated, navigate])

  // 이미지 재시도 함수
  const retryImageConversion = useCallback((imageId) => {
    const imageToRetry = images.find(img => img.id === imageId)
    if (!imageToRetry || !imageToRetry.sharedImageUrl) return

    // 변환 중 상태로 설정
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId 
          ? { ...img, isConverting: true, conversionError: false, needsRetry: false }
          : img
      )
    )

    // 이미지 변환 재시도 (프록시 API 사용)
    const convertImageToFile = async () => {
      try {
        
        // 이미지 프록시 API를 통해 CORS 문제 해결
        const proxyResult = await proxyImage(imageToRetry.sharedImageUrl)
        // 프록시된 이미지 URL로 fetch
        const response = await fetch(proxyResult.url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        const file = new File([blob], `retry-${Date.now()}.jpg`, {
          type: blob.type || 'image/jpeg'
        })
        
        // 변환 완료된 이미지로 업데이트
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === imageId 
              ? { ...img, file: file, isConverting: false }
              : img
          )
        )
        
      } catch (error) {
        console.error("공유 이미지 재변환 실패:", error)
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === imageId 
              ? { ...img, isConverting: false, conversionError: true, needsRetry: true }
              : img
          )
        )
      }
    }
    
    convertImageToFile()
  }, [images])

  // 전역 재시도 함수 등록
  useEffect(() => {
    window.retryImageConversion = retryImageConversion
    return () => {
      delete window.retryImageConversion
    }
  }, [retryImageConversion])

  // 마이페이지에서 공유받은 데이터 처리
  useEffect(() => {
    if (location.state?.sharedContent) {
      const sharedContent = location.state.sharedContent
      
      // 폼 데이터 설정
      setFormData({
        title: sharedContent.title || "",
        content: sharedContent.description || ""
      })
      
      // 이미지 즉시 추가 (미리보기용)
      if (sharedContent.image) {
        const newImage = {
          id: Date.now(),
          file: null, // 나중에 변환
          preview: sharedContent.image,
          order: 1,
          isConverting: true, // 변환 중 상태 표시
          sharedImageUrl: sharedContent.image // 원본 URL 저장
        }
        
        setImages([newImage])
        
        // 백그라운드에서 File 객체로 변환 (프록시 API 사용)
        const convertImageToFile = async () => {
          try {
            
            // 이미지 프록시 API를 통해 CORS 문제 해결
            const proxyResult = await proxyImage(sharedContent.image)
            // 프록시된 이미지 URL로 fetch
            const response = await fetch(proxyResult.url)
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const blob = await response.blob()
            const file = new File([blob], `${sharedContent.type}-${sharedContent.id}.jpg`, {
              type: blob.type || 'image/jpeg'
            })
            
            // 변환 완료된 이미지로 업데이트
            setImages(prevImages => 
              prevImages.map(img => 
                img.id === newImage.id 
                  ? { ...img, file: file, isConverting: false }
                  : img
              )
            )
            
          } catch (error) {
            console.error("공유 이미지 변환 실패:", error)
            // 변환 실패 시 변환 중 상태 해제하고 재시도 옵션 제공
            setImages(prevImages => 
              prevImages.map(img => 
                img.id === newImage.id 
                  ? { ...img, isConverting: false, conversionError: true, needsRetry: true }
                  : img
              )
            )
          }
        }
        
        convertImageToFile()
      }
      
    }
  }, [location.state])

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


  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid) {
      setError("제목과 내용을 모두 입력해주세요.")
      return
    }

    // 이미지 상태별 확인
    const hasConvertingImages = images.some((img) => img.isConverting)
    const hasErrorImages = images.some((img) => img.conversionError)
    const hasSharedImagesWithoutFile = images.some((img) => img.sharedImageUrl && !img.file && !img.isConverting)
    
    
    // 공유받은 이미지가 아직 변환되지 않은 경우
    if (hasSharedImagesWithoutFile) {
      if (!window.confirm("공유받은 이미지가 아직 처리되지 않았습니다. 완료될 때까지 기다리시겠습니까?")) {
        return
      }
    }
    
    if (hasConvertingImages) {
      if (!window.confirm("이미지가 아직 처리 중입니다. 완료될 때까지 기다리시겠습니까?")) {
        return
      }
    }
    
    if (hasErrorImages) {
      const choice = window.confirm("처리에 실패한 이미지가 있습니다.\n\n확인: 해당 이미지를 제외하고 계속 진행\n취소: 이미지를 다시 선택하세요")
      if (!choice) {
        // 실패한 이미지들을 제거하고 사용자가 다시 선택할 수 있도록 함
        setImages(prevImages => prevImages.filter(img => !img.conversionError))
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 업로드 가능한 이미지 필터링
      const uploadableImages = images.filter((img) => {
        // 변환 오류가 있는 이미지는 제외
        if (img.conversionError) return false
        
        // 파일이 있는 이미지만 포함
        return !!img.file
      })
      

      // 백엔드 API 호출
      await createFeed(formData, uploadableImages)

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

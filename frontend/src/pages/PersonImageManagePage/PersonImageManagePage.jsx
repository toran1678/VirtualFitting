"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import ImageUploadModal from "./components/ImageUploadModal"
import ImagePreviewModal from "./components/ImagePreviewModal"
import { isLoggedIn } from "../../api/auth"
import styles from "./PersonImageManagePage.module.css"
import { Upload, Plus, Eye, Trash2, Edit3, ImageIcon, RefreshCw, Grid, List } from "lucide-react"
import {
  getPersonImages,
  deletePersonImage,
  updatePersonImage,
  getPersonImageUrl,
  handlePersonImageError,
  getUserImageCount,
  preloadPersonImages,
  personImagesToUrls,
  filterValidPersonImages,
} from "../../api/personImages"

const PersonImageManagePage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // 상태 관리
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState("grid") // grid or list
  const [loadedImageIds, setLoadedImageIds] = useState(new Set()) // 중복 방지용

  // 페이지네이션 설정
  const IMAGES_PER_PAGE = 20

  // 초기 데이터 로드
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      await Promise.all([loadImages(), loadImageCount()])
    }

    checkAuthAndLoadData()
  }, [navigate])

  // 이미지 목록 로드
  const loadImages = async (page = 1, append = false) => {
    if (!append) {
      setLoading(true)
      setLoadedImageIds(new Set()) // 새로 로드할 때 중복 체크 초기화
    }

    try {
      console.log(`이미지 로드 시작: 페이지 ${page}`)
      const data = await getPersonImages(page, IMAGES_PER_PAGE)
      console.log("로드된 이미지 데이터:", data)

      const newImages = data.images || []
      const validImages = filterValidPersonImages(newImages)

      if (append) {
        // 중복 제거: 이미 로드된 이미지는 제외
        const uniqueImages = validImages.filter((img) => !loadedImageIds.has(img.id))

        if (uniqueImages.length > 0) {
          setImages((prev) => [...prev, ...uniqueImages])
          // 새로 추가된 이미지 ID들을 Set에 추가
          setLoadedImageIds((prev) => {
            const newSet = new Set(prev)
            uniqueImages.forEach((img) => newSet.add(img.id))
            return newSet
          })
        }
      } else {
        setImages(validImages)
        // 새로 로드된 이미지 ID들로 Set 초기화
        setLoadedImageIds(new Set(validImages.map((img) => img.id)))
      }

      // 페이지네이션 정보 업데이트
      setHasMore(newImages.length === IMAGES_PER_PAGE)
      setCurrentPage(page)

      // 이미지 미리로드 (성능 최적화)
      if (validImages.length > 0) {
        const imageUrls = personImagesToUrls(validImages)
        preloadPersonImages(imageUrls).catch((error) => {
          console.warn("이미지 프리로드 실패:", error)
        })
      }
    } catch (error) {
      console.error("이미지 로드 실패:", error)
      alert("이미지를 불러오는 중 오류가 발생했습니다.")
      if (!append) {
        setImages([])
        setLoadedImageIds(new Set())
      }
    } finally {
      if (!append) {
        setLoading(false)
      }
    }
  }

  // 이미지 총 개수 로드
  const loadImageCount = async () => {
    try {
      console.log("이미지 개수 조회 시작...")
      const countData = await getUserImageCount()
      console.log("이미지 개수 API 응답:", countData)

      // 다양한 응답 구조에 대응
      const count = countData.total || countData.count || countData.total_count || 0
      console.log("설정될 이미지 개수:", count)

      setTotalCount(count)
    } catch (error) {
      console.error("이미지 개수 조회 실패:", error)
      console.error("에러 상세:", error.response?.data)

      // 실제 이미지 배열 길이로 대체
      if (images.length > 0) {
        console.log("API 실패로 인해 현재 로드된 이미지 개수로 설정:", images.length)
        setTotalCount(images.length)
      } else {
        setTotalCount(0)
      }
    }
  }

  // 더 많은 이미지 로드 (무한 스크롤)
  const loadMoreImages = async () => {
    if (!hasMore || loading) return

    const nextPage = currentPage + 1
    await loadImages(nextPage, true)
  }

  // 새로고침
  const handleRefresh = async () => {
    setRefreshing(true)
    setCurrentPage(1)
    setLoadedImageIds(new Set()) // 중복 체크 초기화
    await Promise.all([loadImages(1, false), loadImageCount()])
    setRefreshing(false)
  }

  // 파일 선택 핸들러
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
    // 파일 입력 초기화
    event.target.value = ""
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length > 0) {
      handleFileUpload(imageFiles[0])
    } else {
      alert("이미지 파일만 업로드 가능합니다.")
    }
  }

  // 파일 업로드 처리
  const handleFileUpload = (file) => {
    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.")
      return
    }

    // 파일 형식 체크
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      alert("JPG, PNG, WEBP 파일만 업로드 가능합니다.")
      return
    }

    // 업로드 모달 열기
    setSelectedImage({ file, isNew: true })
    setShowUploadModal(true)
  }

  // 안전한 날짜 포맷팅 함수
  const formatSafeDate = (dateString) => {
    if (!dateString) return "날짜 없음"

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "날짜 없음"
      }
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      console.error("날짜 파싱 오류:", error)
      return "날짜 없음"
    }
  }

  // 이미지 업로드 완료
  const handleUploadComplete = async (newImage) => {
    console.log("업로드 완료 콜백 받은 데이터:", newImage)

    // 모달 먼저 닫기
    setShowUploadModal(false)
    setSelectedImage(null)

    // 업로드 완료 후 페이지 새로고침 실행
    await handleRefresh()
  }

  // 이미지 삭제
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("이 이미지를 삭제하시겠습니까?")) {
      return
    }

    try {
      await deletePersonImage(imageId)
      setImages((prev) => prev.filter((img) => img.id !== imageId))
      setLoadedImageIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
      setTotalCount((prev) => Math.max(0, prev - 1))
      alert("이미지가 삭제되었습니다.")
    } catch (error) {
      console.error("이미지 삭제 실패:", error)
      alert("이미지 삭제 중 오류가 발생했습니다.")
    }
  }

  // 이미지 미리보기
  const handlePreviewImage = (image) => {
    setSelectedImage(image)
    setShowPreviewModal(true)
  }

  // 이미지 설명 수정
  const handleEditDescription = async (image) => {
    const newDescription = prompt("이미지 설명을 입력하세요:", image.description || "")
    if (newDescription !== null && newDescription !== image.description) {
      try {
        const updatedImage = await updatePersonImage(image.id, newDescription)
        setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, description: newDescription } : img)))
        alert("이미지 설명이 수정되었습니다.")
      } catch (error) {
        console.error("이미지 설명 수정 실패:", error)
        alert("이미지 설명 수정 중 오류가 발생했습니다.")
      }
    }
  }

  // 스크롤 이벤트 핸들러 (무한 스크롤)
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMoreImages()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loading, currentPage])

  if (loading && images.length === 0) {
    return (
      <div className={styles.personImagePage}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>이미지를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.personImagePage}>
      <Header />

      <main className={styles.personImageMain}>
        <div className={styles.container}>
          <div className={styles.pageContainer}>
            {/* 헤더 섹션 */}
            <section className={styles.headerSection}>
              <div className={styles.headerContent}>
                <div className={styles.titleArea}>
                  <h1 className={styles.pageTitle}>내 인물 이미지</h1>
                  <p className={styles.pageDescription}>가상 피팅에 사용할 인물 이미지를 관리하세요</p>
                </div>
                <div className={styles.headerActions}>
                  <button
                    className={`${styles.refreshButton} ${refreshing ? styles.refreshing : ""}`}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="새로고침"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
                    <Plus size={20} />
                    이미지 추가
                  </button>
                </div>
              </div>
            </section>

            {/* 컨트롤 섹션 */}
            <section className={styles.controlSection}>
              <div className={styles.controlContent}>
                <div className={styles.controlLeft}>
                  <h2 className={styles.sectionTitle}>이미지 목록 ({totalCount}개)</h2>
                </div>
                <div className={styles.controlRight}>
                  <div className={styles.viewControls}>
                    <button
                      className={`${styles.viewButton} ${viewMode === "grid" ? styles.active : ""}`}
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid size={20} />
                    </button>
                    <button
                      className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
                      onClick={() => setViewMode("list")}
                    >
                      <List size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 드래그 앤 드롭 영역 */}
            <section className={styles.uploadSection}>
              <div
                className={`${styles.dropZone} ${dragOver ? styles.dragOver : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={styles.dropIcon} />
                <h3>이미지를 드래그하여 업로드하거나 클릭하세요</h3>
                <p>JPG, PNG, WEBP 파일 지원 (최대 10MB)</p>
              </div>
            </section>

            {/* 이미지 목록 섹션 */}
            <section className={styles.imagesSection}>
              {images.length > 0 ? (
                <>
                  <div className={`${styles.imageGrid} ${viewMode === "list" ? styles.listView : ""}`}>
                    {images.map((image) => {
                      const imageUrl = getPersonImageUrl(image.image_url)

                      return (
                        <div key={`image-${image.id}-${image.created_at}`} className={styles.imageCard}>
                          <div className={styles.imageContainer}>
                            <img
                              src={imageUrl || "/placeholder.svg?height=300&width=200&text=No+Image"}
                              alt={image.description || "인물 이미지"}
                              className={styles.image}
                              onError={(e) => handlePersonImageError(e, image.description || "인물 이미지")}
                              onLoad={() => console.log("이미지 로드 성공:", imageUrl)}
                              loading="lazy"
                            />
                            <div className={styles.imageOverlay}>
                              <button
                                className={styles.overlayButton}
                                onClick={() => handlePreviewImage(image)}
                                title="미리보기"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className={styles.overlayButton}
                                onClick={() => handleEditDescription(image)}
                                title="설명 수정"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                className={`${styles.overlayButton} ${styles.deleteButton}`}
                                onClick={() => handleDeleteImage(image.id)}
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className={styles.imageInfo}>
                            <h4 className={styles.imageDescription}>{image.description || "설명 없음"}</h4>
                            <p className={styles.imageDate}>{formatSafeDate(image.created_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 더 보기 버튼 */}
                  {hasMore && (
                    <div className={styles.loadMoreContainer}>
                      <button className={styles.loadMoreButton} onClick={loadMoreImages} disabled={loading}>
                        {loading ? "로딩 중..." : "더 보기"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyContent}>
                  <div className={styles.emptyIcon}>
                    <ImageIcon size={64} />
                  </div>
                  <h3>아직 업로드된 이미지가 없습니다</h3>
                  <p>가상 피팅에 사용할 인물 이미지를 추가해보세요</p>
                  <button className={styles.emptyActionButton} onClick={() => fileInputRef.current?.click()}>
                    <Plus size={20} />첫 번째 이미지 추가하기
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      </main>

      <Footer />

      {/* 업로드 모달 */}
      {showUploadModal && (
        <ImageUploadModal
          image={selectedImage}
          onClose={() => {
            setShowUploadModal(false)
            setSelectedImage(null)
          }}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* 미리보기 모달 */}
      {showPreviewModal && (
        <ImagePreviewModal
          image={selectedImage}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedImage(null)
          }}
          onDelete={handleDeleteImage}
          onEdit={handleEditDescription}
        />
      )}
    </div>
  )
}

export default PersonImageManagePage

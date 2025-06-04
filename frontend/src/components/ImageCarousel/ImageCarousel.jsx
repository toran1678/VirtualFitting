"use client"

import { useState, useEffect, useCallback } from "react"
import { getFeedImageUrl, handleFeedImageError, filterValidImages } from "../../utils/imageUtils"
import styles from "./ImageCarousel.module.css"

const ImageCarousel = ({ images, alt = "이미지" }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [processedImages, setProcessedImages] = useState([])

  // 이미지 배열 처리
  useEffect(() => {
    if (!images || !Array.isArray(images)) {
      setProcessedImages([])
      setIsLoading(false)
      return
    }

    // 유효한 이미지만 필터링하고 URL 생성
    const validImages = filterValidImages(images)
    const processed = validImages.map((image, index) => ({
      id: image.id || index,
      url: getFeedImageUrl(image.image_url || image.url),
      order: image.image_order || image.order || index + 1,
      alt: `${alt} ${index + 1}`,
    }))

    setProcessedImages(processed)
    setIsLoading(false)
    setCurrentIndex(0) // 이미지가 변경되면 첫 번째 이미지로 리셋
  }, [images, alt])

  // 이미지 네비게이션 함수들
  const nextImage = useCallback(() => {
    if (currentIndex < processedImages.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, processedImages.length])

  const prevImage = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const goToImage = useCallback(
    (index) => {
      if (index >= 0 && index < processedImages.length) {
        setCurrentIndex(index)
      }
    },
    [processedImages.length],
  )

  // 터치 이벤트 처리
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      nextImage()
    } else if (isRightSwipe) {
      prevImage()
    }
  }, [touchStart, touchEnd, nextImage, prevImage])

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") {
        prevImage()
      } else if (e.key === "ArrowRight") {
        nextImage()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [nextImage, prevImage])

  // 이미지 로딩 처리
  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageErrorEvent = (e) => {
    setIsLoading(false)
    setHasError(true)
    handleFeedImageError(e, alt)
  }

  // 이미지 유효성 검사
  if (!processedImages || processedImages.length === 0) {
    return (
      <div className={styles.imageGallery}>
        <div className={styles.error}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21,15 16,10 5,21"></polyline>
          </svg>
          <p>이미지가 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.imageGallery}>
      {/* 이미지 카운터 */}
      {processedImages.length > 1 && (
        <div className={styles.imageCounter}>
          {currentIndex + 1}/{processedImages.length}
        </div>
      )}

      {/* 이미지 컨테이너 */}
      <div
        className={styles.imageContainer}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {processedImages.map((image, index) => (
          <div key={image.id || index} className={styles.imageSlide}>
            {hasError && index === currentIndex ? (
              <div className={styles.error}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
                <p>이미지를 불러올 수 없습니다</p>
              </div>
            ) : (
              <img
                src={image.url || "/placeholder.svg?height=400&width=600&text=No+Image"}
                alt={image.alt}
                loading={index === 0 ? "eager" : "lazy"}
                onLoad={handleImageLoad}
                onError={handleImageErrorEvent}
                srcSet={
                  image.url
                    ? `
                  ${image.url}?w=400 400w,
                  ${image.url}?w=600 600w,
                  ${image.url}?w=800 800w
                `
                    : undefined
                }
                sizes="(max-width: 480px) 400px, (max-width: 768px) 600px, 800px"
              />
            )}
          </div>
        ))}
      </div>

      {/* 로딩 상태 */}
      {isLoading && <div className={styles.loading}>이미지 로딩 중...</div>}

      {/* 네비게이션 화살표 */}
      {processedImages.length > 1 && (
        <>
          <button
            className={`${styles.navButton} ${styles.prev}`}
            onClick={prevImage}
            disabled={currentIndex === 0}
            aria-label="이전 이미지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            className={`${styles.navButton} ${styles.next}`}
            onClick={nextImage}
            disabled={currentIndex === processedImages.length - 1}
            aria-label="다음 이미지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </>
      )}

      {/* 점 인디케이터 */}
      {processedImages.length > 1 && (
        <div className={styles.indicators}>
          {processedImages.map((_, index) => (
            <button
              key={index}
              className={`${styles.indicator} ${index === currentIndex ? styles.active : ""}`}
              onClick={() => goToImage(index)}
              aria-label={`이미지 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageCarousel

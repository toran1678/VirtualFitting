// 이미지 URL 생성 유틸리티 함수들

// 백엔드 서버 URL (환경에 따라 변경)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// 이미지 로드 재시도 설정
const MAX_RETRY_COUNT = 2
const RETRY_DELAY = 1000 // 1초

/**
 * 프로필 이미지 URL 생성
 * @param {string} profilePicturePath - 데이터베이스에 저장된 프로필 이미지 경로
 * @returns {string|null} - 완전한 이미지 URL 또는 null
 */
export const getProfileImageUrl = (profilePicturePath) => {
  // 빈 값 체크
  if (!profilePicturePath) {
    return null
  }

  // 이미 완전한 URL인 경우 (http 또는 https로 시작)
  if (profilePicturePath.startsWith("http")) {
    return addCacheBuster(profilePicturePath)
  }

  // 백엔드에서 "/uploads/profile_pictures/filename.jpg" 형태로 저장하는 경우
  // 슬래시가 누락된 경우 대비하여 정규화
  const normalizedPath = profilePicturePath.startsWith("/") ? profilePicturePath : `/${profilePicturePath}`
  return addCacheBuster(`${API_BASE_URL}${normalizedPath}`)
}

/**
 * 피드 이미지 URL 생성
 * @param {string} feedImagePath - 데이터베이스에 저장된 피드 이미지 경로
 * @returns {string|null} - 완전한 이미지 URL 또는 null
 */
export const getFeedImageUrl = (feedImagePath) => {
  // 빈 값 체크
  if (!feedImagePath) {
    return null
  }

  // 이미 완전한 URL인 경우 (http 또는 https로 시작)
  if (feedImagePath.startsWith("http")) {
    return addCacheBuster(feedImagePath)
  }

  // 백엔드에서 "/uploads/feeds/filename.jpg" 형태로 저장하는 경우
  // 슬래시가 누락된 경우 대비하여 정규화
  const normalizedPath = feedImagePath.startsWith("/") ? feedImagePath : `/${feedImagePath}`
  return addCacheBuster(`${API_BASE_URL}${normalizedPath}`)
}

/**
 * 상품 이미지 URL 생성
 * @param {string} productImagePath - 상품 이미지 경로
 * @returns {string|null} - 완전한 이미지 URL 또는 null
 */
export const getProductImageUrl = (productImagePath) => {
  if (!productImagePath) {
    return null
  }

  // 이미 완전한 URL인 경우
  if (productImagePath.startsWith("http")) {
    return addCacheBuster(productImagePath)
  }

  // 상품 이미지도 동일한 방식으로 처리
  // 백엔드에서 "/uploads/products/filename.jpg" 형태로 저장한다고 가정
  // 슬래시가 누락된 경우 대비하여 정규화
  const normalizedPath = productImagePath.startsWith("/") ? productImagePath : `/${productImagePath}`
  return addCacheBuster(`${API_BASE_URL}${normalizedPath}`)
}

/**
 * 범용 이미지 URL 생성 (모든 타입의 이미지에 사용 가능)
 * @param {string} imagePath - 이미지 경로
 * @param {string} fallbackUrl - 대체 이미지 URL
 * @returns {string} - 완전한 이미지 URL 또는 대체 URL
 */
export const getImageUrl = (imagePath, fallbackUrl = "/placeholder.svg?height=400&width=600&text=No+Image") => {
  // 빈 값 체크
  if (!imagePath) {
    return fallbackUrl
  }

  // 이미 완전한 URL인 경우
  if (imagePath.startsWith("http")) {
    return addCacheBuster(imagePath)
  }

  // 상대 경로인 경우 슬래시 추가 (백엔드에서 슬래시가 누락된 경우 대비)
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`
  
  // 서버 URL과 결합
  return addCacheBuster(`${API_BASE_URL}${normalizedPath}`)
}

/**
 * 캐시 방지를 위한 타임스탬프 추가
 * @param {string} url - 원본 URL
 * @returns {string} - 캐시 방지 파라미터가 추가된 URL
 */
export const addCacheBuster = (url) => {
  if (!url) return url

  // 개발 환경에서만 캐시 방지 적용 (프로덕션에서는 캐싱 활용)
  if (process.env.NODE_ENV !== "development") return url

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}t=${Date.now()}`
}

/**
 * 이미지 로드 에러 처리 (개선된 버전)
 * @param {Event} event - 이미지 로드 에러 이벤트
 * @param {string} fallbackSrc - 대체 이미지 URL (기본값: placeholder)
 */
export const handleImageError = (event, fallbackSrc = "/placeholder.svg") => {
  const img = event.target
  const originalSrc = img.dataset.originalSrc || img.src
  const retryCount = Number.parseInt(img.dataset.retryCount || "0", 10)

  console.warn(`이미지 로드 실패 (${retryCount}/${MAX_RETRY_COUNT}):`, originalSrc)

  // 원본 소스 저장
  if (!img.dataset.originalSrc) {
    img.dataset.originalSrc = originalSrc
  }

  // 최대 재시도 횟수 이내면 재시도
  if (retryCount < MAX_RETRY_COUNT) {
    img.dataset.retryCount = (retryCount + 1).toString()

    // 재시도 시 캐시 방지를 위한 타임스탬프 추가
    setTimeout(() => {
      const newSrc = addCacheBuster(originalSrc)
      console.log(`이미지 재시도 (${retryCount + 1}/${MAX_RETRY_COUNT}):`, newSrc)
      img.src = newSrc
    }, RETRY_DELAY)
  } else {
    // 최대 재시도 횟수 초과 시 대체 이미지 표시
    console.log(`이미지 로드 최종 실패, fallback 사용:`, fallbackSrc)
    img.src = fallbackSrc
    img.onerror = null // 무한 루프 방지

    // 이미지 로드 실패 시 부모 요소에 클래스 추가
    if (img.parentElement) {
      img.parentElement.classList.add("image-load-failed")
    }

    // 이미지 로드 실패 이벤트 발생
    const failEvent = new CustomEvent("imageLoadFailed", {
      detail: { originalSrc, fallbackSrc },
    })
    img.dispatchEvent(failEvent)
  }
}

/**
 * 피드 이미지 전용 에러 처리 (개선된 버전)
 * @param {Event} event - 이미지 로드 에러 이벤트
 * @param {string} alt - 이미지 alt 텍스트
 */
export const handleFeedImageError = (event, alt = "이미지") => {
  const fallbackSrc = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(alt)}`
  handleImageError(event, fallbackSrc)
}

/**
 * 프로필 이미지 전용 에러 처리 (개선된 버전)
 * @param {Event} event - 이미지 로드 에러 이벤트
 * @param {string} nickname - 사용자 닉네임
 */
export const handleProfileImageError = (event, nickname = "User") => {
  const fallbackSrc = `/placeholder.svg?height=40&width=40&text=${encodeURIComponent(nickname.charAt(0))}`
  handleImageError(event, fallbackSrc)
}

/**
 * 이미지 미리로드 (성능 최적화용) (개선된 버전)
 * @param {string} imageUrl - 미리로드할 이미지 URL
 * @returns {Promise<HTMLImageElement>} - 이미지 로드 완료 Promise
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error("유효하지 않은 이미지 URL"))
      return
    }

    const img = new Image()

    // 로드 타임아웃 설정 (5초)
    const timeoutId = setTimeout(() => {
      img.src = "" // 로딩 중단
      reject(new Error(`이미지 로드 타임아웃: ${imageUrl}`))
    }, 5000)

    img.onload = () => {
      clearTimeout(timeoutId)
      console.log(`이미지 프리로드 성공: ${imageUrl}`)
      resolve(img)
    }

    img.onerror = () => {
      clearTimeout(timeoutId)
      console.error(`이미지 프리로드 실패: ${imageUrl}`)
      reject(new Error(`이미지 로드 실패: ${imageUrl}`))
    }

    // CORS 설정
    img.crossOrigin = "anonymous"
    img.src = imageUrl
  })
}

/**
 * 여러 이미지를 동시에 미리로드 (개선된 버전)
 * @param {string[]} imageUrls - 미리로드할 이미지 URL 배열
 * @returns {Promise<Object>} - 로드 결과 객체
 */
export const preloadImages = async (imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    console.warn("프리로드할 이미지가 없습니다.")
    return { success: 0, failed: 0, total: 0 }
  }

  console.log(`${imageUrls.length}개 이미지 프리로드 시작`)

  // 유효한 URL만 필터링
  const validUrls = imageUrls.filter((url) => url && typeof url === "string" && !url.includes("placeholder.svg"))

  if (validUrls.length === 0) {
    console.warn("프리로드할 유효한 이미지 URL이 없습니다.")
    return { success: 0, failed: 0, total: 0 }
  }

  const results = await Promise.allSettled(validUrls.map((url) => preloadImage(url)))

  const successful = results.filter((result) => result.status === "fulfilled").length
  const failed = results.filter((result) => result.status === "rejected").length

  console.log(`이미지 프리로드 완료: 성공 ${successful}개, 실패 ${failed}개, 총 ${validUrls.length}개`)

  return {
    success: successful,
    failed: failed,
    total: validUrls.length,
    results,
  }
}

/**
 * 이미지 URL 유효성 검사 (개선된 버전)
 * @param {string} imageUrl - 검사할 이미지 URL
 * @returns {Promise<boolean>} - 이미지 유효성 여부
 */
export const validateImageUrl = async (imageUrl) => {
  if (!imageUrl) return false

  try {
    // HEAD 요청으로 빠르게 확인
    const response = await fetch(imageUrl, {
      method: "HEAD",
      cache: "no-store",
      mode: "no-cors",
    })
    return response.ok
  } catch (error) {
    console.warn(`이미지 URL 검증 실패: ${imageUrl}`, error)
    return false
  }
}

/**
 * 이미지 배열에서 유효한 URL들만 필터링
 * @param {Array} images - 이미지 객체 배열
 * @returns {Array} - 유효한 URL을 가진 이미지 배열
 */
export const filterValidImages = (images) => {
  if (!Array.isArray(images)) return []

  return images.filter((image) => {
    if (!image) return false

    // image_url 또는 url 속성 확인
    const imageUrl = image.image_url || image.url
    return imageUrl && imageUrl.trim() !== ""
  })
}

/**
 * 이미지 배열을 URL 배열로 변환
 * @param {Array} images - 이미지 객체 배열
 * @returns {Array} - URL 문자열 배열
 */
export const imagesToUrls = (images) => {
  const validImages = filterValidImages(images)

  return validImages
    .map((image) => {
      const imageUrl = image.image_url || image.url
      return getFeedImageUrl(imageUrl)
    })
    .filter((url) => url !== null)
}

/**
 * 이미지 로드 상태 모니터링 (새로운 함수)
 * @param {string} selector - 이미지 요소 선택자
 * @returns {Object} - 모니터링 제어 객체
 */
export const monitorImageLoading = (selector = "img") => {
  const images = document.querySelectorAll(selector)
  const stats = {
    total: images.length,
    loaded: 0,
    failed: 0,
    inProgress: images.length,
  }

  console.log(`이미지 로딩 모니터링 시작: ${stats.total}개 이미지`)

  images.forEach((img) => {
    // 이미 로드된 이미지 처리
    if (img.complete) {
      stats.loaded++
      stats.inProgress--
      return
    }

    // 로드 이벤트 리스너
    img.addEventListener("load", () => {
      stats.loaded++
      stats.inProgress--
      console.log(`이미지 로드 성공 (${stats.loaded}/${stats.total}): ${img.src}`)
    })

    // 에러 이벤트 리스너
    img.addEventListener("error", () => {
      stats.failed++
      stats.inProgress--
      console.warn(`이미지 로드 실패 (${stats.failed}/${stats.total}): ${img.src}`)
    })
  })

  return {
    getStats: () => ({ ...stats }),
    isComplete: () => stats.inProgress === 0,
  }
}

/**
 * 이미지 요소에 로딩 상태 클래스 추가 (새로운 함수)
 * @param {HTMLImageElement} img - 이미지 요소
 */
export const addLoadingStateClasses = (img) => {
  if (!img) return

  const parent = img.parentElement
  if (!parent) return

  // 로딩 상태 클래스 추가
  parent.classList.add("image-loading")

  // 로드 완료 시 클래스 변경
  img.addEventListener("load", () => {
    parent.classList.remove("image-loading")
    parent.classList.add("image-loaded")
  })

  // 로드 실패 시 클래스 변경
  img.addEventListener("error", () => {
    parent.classList.remove("image-loading")
    parent.classList.add("image-error")
  })
}
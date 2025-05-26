// 이미지 URL 생성 유틸리티 함수들

// 백엔드 서버 URL (환경에 따라 변경)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

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
    return profilePicturePath
  }

  // 백엔드에서 "/uploads/profile_pictures/filename.jpg" 형태로 저장하는 경우
  // 단순히 서버 URL과 결합
  return `${API_BASE_URL}${profilePicturePath}`
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
    return productImagePath
  }

  // 상품 이미지도 동일한 방식으로 처리
  // 백엔드에서 "/uploads/products/filename.jpg" 형태로 저장한다고 가정
  return `${API_BASE_URL}${productImagePath}`
}

/**
 * 이미지 로드 에러 처리
 * @param {Event} event - 이미지 로드 에러 이벤트
 * @param {string} fallbackSrc - 대체 이미지 URL (기본값: placeholder)
 */
export const handleImageError = (event, fallbackSrc = "/placeholder.svg") => {
  console.warn("이미지 로드 실패:", event.target.src)
  event.target.src = fallbackSrc
}

/**
 * 이미지 미리로드 (성능 최적화용)
 * @param {string} imageUrl - 미리로드할 이미지 URL
 * @returns {Promise<HTMLImageElement>} - 이미지 로드 완료 Promise
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageUrl
  })
}

/**
 * 여러 이미지를 동시에 미리로드
 * @param {string[]} imageUrls - 미리로드할 이미지 URL 배열
 * @returns {Promise<HTMLImageElement[]>} - 모든 이미지 로드 완료 Promise
 */
export const preloadImages = (imageUrls) => {
  return Promise.all(imageUrls.map((url) => preloadImage(url)))
}

/**
 * 이미지 URL 유효성 검사
 * @param {string} imageUrl - 검사할 이미지 URL
 * @returns {Promise<boolean>} - 이미지 유효성 여부
 */
export const validateImageUrl = async (imageUrl) => {
  try {
    await preloadImage(imageUrl)
    return true
  } catch (error) {
    return false
  }
}

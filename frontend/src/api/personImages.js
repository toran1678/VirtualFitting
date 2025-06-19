/**
 * ===================================================================
 * 인물 이미지 관리 API (완전한 버전)
 * ===================================================================
 */

import axios from "axios"

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// axios 인스턴스 생성
const personImageAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/person-images`,
  withCredentials: true, // 세션 쿠키 전송
  timeout: 30000,
})

// 인증 헤더 생성 (세션 기반이므로 빈 객체 반환)
const getAuthHeaders = () => {
  return {
    // 세션 기반 인증이므로 특별한 헤더 불필요
    // credentials: 'include'로 쿠키가 자동 전송됨
  }
}

// API 에러 처리
const handleApiError = (error) => {
  if (error.response?.status === 401 || error.message.includes("401")) {
    // 인증 오류인 경우
    alert("로그인이 필요합니다.")
    window.location.href = "/login"
    return new Error("로그인이 필요합니다.")
  }

  return error
}

// 요청 인터셉터
personImageAPI.interceptors.request.use(
  (config) => {
    console.log(`📤 PersonImage API 요청: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    // 인증 헤더 추가
    config.headers = { ...config.headers, ...getAuthHeaders() }
    return config
  },
  (error) => {
    console.error("📤 요청 오류:", error)
    return Promise.reject(error)
  },
)

// 응답 인터셉터
personImageAPI.interceptors.response.use(
  (response) => {
    console.log(
      `📥 PersonImage API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`,
      response.data,
    )
    return response
  },
  (error) => {
    console.error("📥 응답 오류:", error)
    return Promise.reject(handleApiError(error))
  },
)

// 인물 이미지 업로드
export const uploadPersonImage = async (file, description = "") => {
  try {
    const formData = new FormData()
    formData.append("file", file)
    if (description) {
      formData.append("description", description)
    }

    const response = await personImageAPI.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return {
      success: true,
      image: response.data,
    }
  } catch (error) {
    console.error("이미지 업로드 오류:", error)
    return {
      success: false,
      message: error.response?.data?.detail || error.message || "이미지 업로드에 실패했습니다.",
    }
  }
}

// 인물 이미지 목록 조회
export const getPersonImages = async (page = 1, perPage = 20) => {
  try {
    const params = {
      page: page.toString(),
      per_page: perPage.toString(),
    }

    const response = await personImageAPI.get("/", { params })
    return response.data
  } catch (error) {
    console.error("이미지 목록 조회 오류:", error)
    throw error
  }
}

// 특정 인물 이미지 조회
export const getPersonImage = async (imageId) => {
  try {
    const response = await personImageAPI.get(`/${imageId}`)
    return response.data
  } catch (error) {
    console.error("이미지 조회 오류:", error)
    throw error
  }
}

// 인물 이미지 정보 수정
export const updatePersonImage = async (imageId, description) => {
  try {
    const response = await personImageAPI.put(`/${imageId}`, {
      description: description,
    })
    return response.data
  } catch (error) {
    console.error("이미지 정보 수정 오류:", error)
    throw error
  }
}

// 인물 이미지 삭제
export const deletePersonImage = async (imageId) => {
  try {
    const response = await personImageAPI.delete(`/${imageId}`)
    return response.data
  } catch (error) {
    console.error("이미지 삭제 오류:", error)
    throw error
  }
}

// 사용자 이미지 총 개수 조회
export const getUserImageCount = async () => {
  try {
    const response = await personImageAPI.get("/count/total")
    return response.data
  } catch (error) {
    console.error("이미지 개수 조회 오류:", error)
    throw error
  }
}

// 이미지 URL 생성 헬퍼 함수
export const getPersonImageUrl = (imagePath) => {
  if (!imagePath) return null

  // 절대 경로인 경우 그대로 반환
  if (imagePath.startsWith("http")) {
    return imagePath
  }

  // 상대 경로인 경우 API 서버 URL과 결합
  return `${API_BASE_URL}/${imagePath.replace(/^\/+/, "")}`
}

// 이미지 로드 에러 처리 헬퍼 함수
export const handlePersonImageError = (event, fallbackText = "IMG") => {
  const img = event.target
  const parent = img.parentElement

  // 이미지를 숨기고 대체 텍스트 표시
  img.style.display = "none"

  if (!parent.querySelector(".image-fallback")) {
    const fallback = document.createElement("div")
    fallback.className = "image-fallback"
    fallback.textContent = fallbackText.charAt(0).toUpperCase()
    fallback.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f0f0f0;
      color: #666;
      font-weight: bold;
      font-size: 1.2em;
    `
    parent.appendChild(fallback)
  }
}

// 캐시 방지를 위한 타임스탬프 추가 (개발 환경용)
export const addCacheBuster = (url) => {
  if (!url) return url

  // 개발 환경에서만 캐시 방지 적용
  if (process.env.NODE_ENV !== "development") return url

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}t=${Date.now()}`
}

// 향상된 이미지 URL 생성 (캐시 방지 포함)
export const getPersonImageUrlWithCache = (imagePath) => {
  const baseUrl = getPersonImageUrl(imagePath)
  return addCacheBuster(baseUrl)
}

// 이미지 미리로드 함수
export const preloadPersonImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error("유효하지 않은 이미지 URL"))
      return
    }

    const img = new Image()

    // 로드 타임아웃 설정 (5초)
    const timeoutId = setTimeout(() => {
      img.src = ""
      reject(new Error(`이미지 로드 타임아웃: ${imageUrl}`))
    }, 5000)

    img.onload = () => {
      clearTimeout(timeoutId)
      console.log(`인물 이미지 프리로드 성공: ${imageUrl}`)
      resolve(img)
    }

    img.onerror = () => {
      clearTimeout(timeoutId)
      console.error(`인물 이미지 프리로드 실패: ${imageUrl}`)
      reject(new Error(`이미지 로드 실패: ${imageUrl}`))
    }

    // CORS 설정
    img.crossOrigin = "anonymous"
    img.src = imageUrl
  })
}

// 여러 인물 이미지를 동시에 미리로드
export const preloadPersonImages = async (imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    console.warn("프리로드할 인물 이미지가 없습니다.")
    return { success: 0, failed: 0, total: 0 }
  }

  console.log(`${imageUrls.length}개 인물 이미지 프리로드 시작`)

  // 유효한 URL만 필터링
  const validUrls = imageUrls.filter((url) => url && typeof url === "string")

  if (validUrls.length === 0) {
    console.warn("프리로드할 유효한 인물 이미지 URL이 없습니다.")
    return { success: 0, failed: 0, total: 0 }
  }

  const results = await Promise.allSettled(validUrls.map((url) => preloadPersonImage(url)))

  const successful = results.filter((result) => result.status === "fulfilled").length
  const failed = results.filter((result) => result.status === "rejected").length

  console.log(`인물 이미지 프리로드 완료: 성공 ${successful}개, 실패 ${failed}개, 총 ${validUrls.length}개`)

  return {
    success: successful,
    failed: failed,
    total: validUrls.length,
    results,
  }
}

// 이미지 유효성 검사
export const validatePersonImageUrl = async (imageUrl) => {
  if (!imageUrl) return false

  try {
    // HEAD 요청으로 빠르게 확인
    const response = await axios.head(imageUrl, {
      timeout: 5000,
      withCredentials: true,
    })
    return response.status === 200
  } catch (error) {
    console.warn(`인물 이미지 URL 검증 실패: ${imageUrl}`, error)
    return false
  }
}

// 이미지 배열에서 유효한 URL들만 필터링
export const filterValidPersonImages = (images) => {
  if (!Array.isArray(images)) return []

  return images.filter((image) => {
    if (!image) return false

    // image_url 또는 url 속성 확인
    const imageUrl = image.image_url || image.url
    return imageUrl && imageUrl.trim() !== ""
  })
}

// 인물 이미지 배열을 URL 배열로 변환
export const personImagesToUrls = (images) => {
  const validImages = filterValidPersonImages(images)

  return validImages
    .map((image) => {
      const imageUrl = image.image_url || image.url
      return getPersonImageUrl(imageUrl)
    })
    .filter((url) => url !== null)
}

// 이미지 압축 함수 (업로드 전 최적화용)
export const compressPersonImage = (file, maxWidth = 1200, maxHeight = 1600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // 비율 계산
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height)

      // Blob으로 변환
      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        "image/jpeg",
        quality,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// 이미지 메타데이터 추출
export const extractPersonImageMetadata = (file) => {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      const metadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        size: file.size,
        type: file.type,
        name: file.name,
        lastModified: file.lastModified,
      }

      URL.revokeObjectURL(img.src)
      resolve(metadata)
    }

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        aspectRatio: 0,
        size: file.size,
        type: file.type,
        name: file.name,
        lastModified: file.lastModified,
      })
    }

    img.src = URL.createObjectURL(file)
  })
}

"use client"

// 이미지 로딩 상태 관리 훅
import { useState, useEffect } from "react"
import { getProfileImageUrl } from "../utils/imageUtils"

export const useImageLoader = (imagePath) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!imagePath) {
      setIsLoading(false)
      setHasError(true)
      return
    }

    setIsLoading(true)
    setHasError(false)

    const fullUrl = getProfileImageUrl(imagePath)

    // 이미지 미리로드로 존재 여부 확인
    const img = new Image()

    img.onload = () => {
      setImageUrl(fullUrl)
      setIsLoading(false)
      setHasError(false)
    }

    img.onerror = () => {
      console.warn("이미지 로드 실패:", fullUrl)
      setImageUrl(null)
      setIsLoading(false)
      setHasError(true)
    }

    img.src = fullUrl
  }, [imagePath])

  return { imageUrl, isLoading, hasError }
}

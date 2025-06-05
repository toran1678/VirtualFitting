"use client"

import { useState, useEffect, useRef } from "react"
import { handleImageError } from "../utils/imageUtils"

const ImageWithFallback = ({
  src,
  alt,
  fallbackSrc = "/placeholder.svg?height=300&width=300",
  className = "",
  onLoad,
  style = {},
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  // src가 변경되면 상태 초기화
  useEffect(() => {
    if (src !== imgSrc) {
      setImgSrc(src)
      setLoading(true)
      setError(false)
    }
  }, [src, imgSrc])

  const handleError = (e) => {
    // 기존 이미지 에러 핸들러 사용
    handleImageError(e, fallbackSrc)

    // 최종적으로 fallback 이미지로 대체되었을 때 에러 상태 설정
    if (e.target.src === fallbackSrc) {
      setError(true)
      setLoading(false)
    }
  }

  const handleLoad = () => {
    setLoading(false)
    setError(false)
    if (onLoad) onLoad()
  }

  // 로딩 중이거나 에러 상태일 때의 placeholder
  const renderPlaceholder = () => {
    if (loading && !error) {
      return (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
          style={style}
        >
          <div className="w-8 h-8 border-2 border-t-blue-500 border-gray-300 rounded-full animate-spin mb-2"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">로딩 중...</span>
        </div>
      )
    }

    if (error || !imgSrc) {
      return (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ${className}`}
          style={style}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-2 opacity-60"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
          <span className="text-sm text-center px-2">이미지가 없습니다</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 실제 이미지 */}
      <img
        ref={imgRef}
        src={imgSrc || fallbackSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        } ${className}`}
        onError={handleError}
        onLoad={handleLoad}
        style={style}
        {...props}
      />

      {/* Placeholder */}
      {renderPlaceholder()}
    </div>
  )
}

export default ImageWithFallback

"use client"

import { useState, useRef, useCallback } from "react"
import styles from "./ImageUploader.module.css"

const ImageUploader = ({ images, onImagesChange, maxImages = 10 }) => {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // 파일 검증
  const validateFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      alert("JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.")
      return false
    }

    if (file.size > maxSize) {
      alert("이미지 크기는 10MB 이하여야 합니다.")
      return false
    }

    return true
  }

  // 파일 처리
  const processFiles = useCallback(
    (files) => {
      const fileArray = Array.from(files)
      const validFiles = fileArray.filter(validateFile)

      if (images.length + validFiles.length > maxImages) {
        alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`)
        return
      }

      const newImages = validFiles.map((file, index) => ({
        id: Date.now() + index,
        file,
        preview: URL.createObjectURL(file),
        order: images.length + index + 1,
      }))

      onImagesChange([...images, ...newImages])
    },
    [images, maxImages, onImagesChange],
  )

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer.files
      processFiles(files)
    },
    [processFiles],
  )

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e) => {
      const files = e.target.files
      if (files) {
        processFiles(files)
      }
      // input 초기화
      e.target.value = ""
    },
    [processFiles],
  )

  // 업로드 영역 클릭
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={styles.imageUploadSection}>
      <label className={styles.formLabel}>
        이미지 ({images.length}/{maxImages})
      </label>

      {/* 업로드 영역 */}
      <div
        className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <div className={styles.uploadIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className={styles.uploadText}>이미지를 드래그하거나 클릭하여 업로드</div>
        <div className={styles.uploadSubtext}>JPG, PNG, WebP 형식 지원 (최대 10MB)</div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className={styles.hiddenFileInput}
        />
      </div>

      {/* 이미지 미리보기 */}
      {images.length > 0 && (
        <div className={styles.imagePreviewGrid}>
          {images.map((image, index) => (
            <ImagePreviewItem
              key={image.id}
              image={image}
              index={index}
              images={images}
              onImagesChange={onImagesChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 개별 이미지 미리보기 컴포넌트
const ImagePreviewItem = ({ image, index, images, onImagesChange }) => {
  const [isDragging, setIsDragging] = useState(false)

  // 이미지 삭제
  const handleDelete = (e) => {
    e.stopPropagation()

    // 복원된 이미지가 아닌 경우에만 URL 해제
    if (!image.isRestored && image.preview) {
      URL.revokeObjectURL(image.preview)
    }

    const newImages = images.filter((img) => img.id !== image.id)
    // 순서 재정렬
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      order: idx + 1,
    }))
    onImagesChange(reorderedImages)
  }

  // 드래그 시작
  const handleDragStart = (e) => {
    setIsDragging(true)
    e.dataTransfer.setData("text/plain", index.toString())
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // 드롭 허용
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // 드롭 처리
  const handleDrop = (e) => {
    e.preventDefault()
    const dragIndex = Number.parseInt(e.dataTransfer.getData("text/plain"))
    const dropIndex = index

    if (dragIndex === dropIndex) return

    const newImages = [...images]
    const draggedImage = newImages[dragIndex]
    newImages.splice(dragIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)

    // 순서 재정렬
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      order: idx + 1,
    }))

    onImagesChange(reorderedImages)
  }

  return (
    <div
      className={`${styles.imagePreviewItem} ${isDragging ? styles.dragging : ""} ${image.isRestored ? styles.restored : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <img src={image.preview || "/placeholder.svg"} alt={`미리보기 ${index + 1}`} className={styles.previewImage} />

      {/* 복원된 이미지 표시 */}
      {image.isRestored && (
        <div className={styles.restoredBadge} title="임시저장된 이미지입니다. 파일 정보가 없어 업로드할 수 없습니다.">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      {/* 공유받은 이미지 성공 표시 */}
      {image.sharedImageUrl && image.file && !image.isConverting && !image.conversionError && (
        <div className={styles.sharedBadge} title="공유받은 이미지가 성공적으로 처리되었습니다.">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      )}

      {/* 변환 중 상태 표시 */}
      {image.isConverting && (
        <div className={styles.convertingBadge} title="이미지를 처리하는 중입니다...">
          <div className={styles.spinner}></div>
          <span>처리 중...</span>
        </div>
      )}

      {/* 변환 오류 상태 표시 */}
      {image.conversionError && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorContent}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>처리 실패</span>
            {image.needsRetry && (
              <button 
                className={styles.retryButton}
                onClick={(e) => {
                  e.stopPropagation()
                  // 재시도 로직은 부모 컴포넌트에서 처리
                  if (window.retryImageConversion) {
                    window.retryImageConversion(image.id)
                  }
                }}
              >
                재시도
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.imageActions}>
        <button className={`${styles.imageActionButton} ${styles.deleteButton}`} onClick={handleDelete}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className={styles.orderBadge}>{image.order}</div>
    </div>
  )
}

export default ImageUploader

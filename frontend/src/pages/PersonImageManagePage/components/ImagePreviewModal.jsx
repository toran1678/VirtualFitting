"use client"

import { useState } from "react"
import styles from "../PersonImageManagePage.module.css"
import { X, Edit3, Trash2, Download } from "lucide-react"
import { getPersonImageUrl } from "../../../api/personImages"

const ImagePreviewModal = ({ image, onClose, onDelete, onEdit }) => {
  const [loading, setLoading] = useState(false)

  if (!image) return null

  // 이미지 다운로드
  const handleDownload = async () => {
    try {
      const imageUrl = getPersonImageUrl(image.image_url)
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `person-image-${image.id}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("다운로드 실패:", error)
      alert("이미지 다운로드 중 오류가 발생했습니다.")
    }
  }

  // 가상 피팅으로 이동
  const handleUseForFitting = () => {
    // TODO: 가상 피팅 페이지로 이동하면서 이미지 정보 전달
    window.location.href = `/virtual-fitting?personImage=${image.id}`
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>이미지 미리보기</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.previewContent}>
          {/* 이미지 */}
          <div className={styles.previewImageContainer}>
            <img
              src={getPersonImageUrl(image.image_url) || "/placeholder.svg"}
              alt={image.description || "인물 이미지"}
              className={styles.previewImageLarge}
            />
          </div>

          {/* 이미지 정보 */}
          <div className={styles.previewInfo}>
            <div className={styles.infoSection}>
              <h3>이미지 정보</h3>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>설명:</span>
                <span className={styles.infoValue}>{image.description || "설명 없음"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>업로드 날짜:</span>
                <span className={styles.infoValue}>
                  {new Date(image.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className={styles.previewActions}>
              <button className={styles.primaryActionButton} onClick={handleUseForFitting}>
                가상 피팅에 사용하기
              </button>

              <div className={styles.secondaryActions}>
                <button className={styles.actionButton} onClick={() => onEdit(image)} title="설명 수정">
                  <Edit3 size={18} />
                </button>
                <button className={styles.actionButton} onClick={handleDownload} title="다운로드">
                  <Download size={18} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => {
                    onDelete(image.id)
                    onClose()
                  }}
                  title="삭제"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImagePreviewModal

"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import styles from "../PersonImageManagePage.module.css"
import { X, Crop, Upload } from "lucide-react"
import { uploadPersonImage } from "../../../api/personImages"

const ImageUploadModal = ({ image, onClose, onUploadComplete }) => {
  const [description, setDescription] = useState("")
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [imageSrc, setImageSrc] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showCrop, setShowCrop] = useState(false)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [croppedImageSrc, setCroppedImageSrc] = useState("")
  const [croppedImageBlob, setCroppedImageBlob] = useState(null) // blob 데이터 저장용 추가

  // 이미지 로드 시 초기 설정
  useEffect(() => {
    if (image?.file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target.result)
      }
      reader.readAsDataURL(image.file)
    }
  }, [image])

  // 이미지 로드 완료 시 기본 크롭 설정
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 80,
        },
        3 / 4, // 3:4 비율 (인물 사진에 적합)
        width,
        height,
      ),
      width,
      height,
    )
    setCrop(crop)
  }, [])

  // 크롭된 이미지를 캔버스에 그리기
  const getCroppedImg = useCallback(() => {
    return new Promise((resolve) => {
      if (!completedCrop || !imgRef.current || !canvasRef.current) {
        console.error("크롭 정보가 없습니다")
        resolve(null)
        return
      }

      const image = imgRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        console.error("캔버스 컨텍스트를 가져올 수 없습니다")
        resolve(null)
        return
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = completedCrop.width * scaleX
      canvas.height = completedCrop.height * scaleY

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      canvas.toBlob(
        (blob) => {
          console.log("크롭된 이미지 생성:", blob)
          resolve(blob)
        },
        "image/jpeg",
        0.9,
      )
    })
  }, [completedCrop])

  // 크롭 완료 처리
  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      console.warn("크롭 완료 조건이 충족되지 않음")
      setShowCrop(false)
      return
    }

    console.log("크롭 완료 처리 시작")
    const croppedBlob = await getCroppedImg()

    if (croppedBlob) {
      // blob 데이터와 URL 모두 저장
      setCroppedImageBlob(croppedBlob)
      const croppedUrl = URL.createObjectURL(croppedBlob)
      setCroppedImageSrc(croppedUrl)
      console.log("크롭된 이미지 저장 완료:", { blob: croppedBlob, url: croppedUrl })
    } else {
      console.error("크롭된 이미지 생성 실패")
    }

    setShowCrop(false)
  }, [completedCrop, getCroppedImg])

  // 업로드 처리
  const handleUpload = async () => {
    if (!description.trim()) {
      alert("이미지 설명을 입력해주세요.")
      return
    }

    setUploading(true)
    try {
      let fileToUpload = image.file

      // 크롭된 이미지가 있으면 사용
      if (croppedImageBlob) {
        console.log("크롭된 이미지 사용:", croppedImageBlob)
        fileToUpload = new File([croppedImageBlob], image.file.name, {
          type: "image/jpeg",
        })
      } else {
        console.log("원본 이미지 사용")
      }

      console.log("업로드할 파일:", fileToUpload)
      const result = await uploadPersonImage(fileToUpload, description.trim())

      if (result.success) {
        onUploadComplete(result.image)
        alert("이미지가 성공적으로 업로드되었습니다!")
      } else {
        throw new Error(result.message || "업로드 실패")
      }
    } catch (error) {
      console.error("업로드 실패:", error)
      let errorMessage = "이미지 업로드 중 오류가 발생했습니다."

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }

      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      if (croppedImageSrc) {
        URL.revokeObjectURL(croppedImageSrc)
      }
    }
  }, [croppedImageSrc])

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>이미지 업로드</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* 이미지 미리보기 및 크롭 */}
          <div className={styles.imagePreviewSection}>
            {imageSrc && (
              <div className={styles.cropContainer}>
                {showCrop ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={3 / 4}
                    minWidth={100}
                    minHeight={133}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc || "/placeholder.svg"}
                      alt="업로드할 이미지"
                      onLoad={onImageLoad}
                      className={styles.cropImage}
                    />
                  </ReactCrop>
                ) : (
                  <img
                    src={croppedImageSrc || imageSrc || "/placeholder.svg"}
                    alt="업로드할 이미지"
                    className={styles.previewImage}
                  />
                )}
              </div>
            )}

            {/* 크롭 토글 버튼 */}
            <div className={styles.cropControls}>
              <button
                className={`${styles.cropToggleButton} ${showCrop ? styles.active : ""}`}
                onClick={showCrop ? handleCropComplete : () => setShowCrop(true)}
              >
                <Crop size={18} />
                {showCrop ? "크롭 완료" : "이미지 자르기"}
              </button>
            </div>
          </div>

          {/* 설명 입력 */}
          <div className={styles.descriptionSection}>
            <label className={styles.label}>
              이미지 설명 <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.descriptionInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 정면 전신 사진, 캐주얼 스타일 등"
              maxLength={200}
              rows={3}
            />
            <div className={styles.characterCount}>{description.length}/200</div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button
            className={styles.uploadSubmitButton}
            onClick={handleUpload}
            disabled={uploading || !description.trim()}
          >
            {uploading ? (
              <>
                <div className={styles.buttonSpinner}></div>
                업로드 중...
              </>
            ) : (
              <>
                <Upload size={18} />
                업로드
              </>
            )}
          </button>
        </div>

        {/* 숨겨진 캔버스 (크롭 처리용) */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  )
}

export default ImageUploadModal

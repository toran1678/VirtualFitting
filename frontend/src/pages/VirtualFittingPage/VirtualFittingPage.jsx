"use client"

import { useState, useContext, useEffect } from "react"
import { ThemeContext } from "../../context/ThemeContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { User, Shirt, Heart, ImageIcon, Camera, Upload, Palette } from "lucide-react"
import { isLoggedIn } from "../../api/auth"
import { getMyLikedClothes } from "../../api/likedClothes"
import styles from "./VirtualFittingPage.module.css"

const VirtualFittingPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const [selectedPersonImage, setSelectedPersonImage] = useState(null)
  const [selectedClothingImage, setSelectedClothingImage] = useState(null)
  const [activeTab, setActiveTab] = useState("liked")
  const [likedClothing, setLikedClothing] = useState([])
  const [likedClothingLoading, setLikedClothingLoading] = useState(false)
  const [personImageFit, setPersonImageFit] = useState("contain")
  const [clothingImageFit, setClothingImageFit] = useState("contain")

  const userImages = [
    {
      id: 1,
      name: "프로필 이미지 1",
      image: "/placeholder.svg?height=300&width=200&text=사용자+이미지+1",
    },
    {
      id: 2,
      name: "프로필 이미지 2",
      image: "/placeholder.svg?height=300&width=200&text=사용자+이미지+2",
    },
    {
      id: 3,
      name: "프로필 이미지 3",
      image: "/placeholder.svg?height=300&width=200&text=사용자+이미지+3",
    },
  ]

  const customClothing = [
    {
      id: 7,
      name: "커스텀 셔츠",
      image: "/placeholder.svg?height=200&width=200&text=커스텀+셔츠",
      category: "상의",
    },
    {
      id: 8,
      name: "커스텀 바지",
      image: "/placeholder.svg?height=200&width=200&text=커스텀+바지",
      category: "하의",
    },
    {
      id: 9,
      name: "커스텀 재킷",
      image: "/placeholder.svg?height=200&width=200&text=커스텀+재킷",
      category: "아우터",
    },
  ]

  // 좋아요한 의류 데이터 로드
  const loadLikedClothes = async () => {
    if (!isLoggedIn()) {
      console.log("로그인이 필요합니다.")
      setLikedClothing([])
      return
    }

    setLikedClothingLoading(true)
    try {
      const data = await getMyLikedClothes()

      // API 응답을 컴포넌트에서 사용할 형태로 변환
      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        name: item.product_name,
        image: item.product_image_url,
        category: item.main_category, // 메인 카테고리만 표시
        brand: item.brand_name,
      }))

      setLikedClothing(formattedData)
    } catch (error) {
      console.error("좋아요한 의류 로드 실패:", error)
      setLikedClothing([])
    } finally {
      setLikedClothingLoading(false)
    }
  }

  useEffect(() => {
    // 컴포넌트 마운트 시 좋아요한 의류 데이터 로드
    loadLikedClothes()
  }, [])

  const handlePersonImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedPersonImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClothingImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedClothingImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUserImageSelect = (userImage) => {
    setSelectedPersonImage(userImage.image)
  }

  const handleClothingSelect = (clothing) => {
    setSelectedClothingImage(clothing.image)
  }

  const handleVirtualFitting = () => {
    if (!selectedPersonImage || !selectedClothingImage) {
      alert("사람 이미지와 의류 이미지를 모두 선택해주세요!")
      return
    }
    alert("가상 피팅을 시작합니다!")
  }

  const togglePersonImageFit = () => {
    setPersonImageFit((prev) => (prev === "contain" ? "cover" : "contain"))
  }

  const toggleClothingImageFit = () => {
    setClothingImageFit((prev) => (prev === "contain" ? "cover" : "contain"))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "liked":
        if (likedClothingLoading) {
          return (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>좋아요한 의류를 불러오는 중...</p>
            </div>
          )
        }

        if (!isLoggedIn()) {
          return (
            <div className={styles.emptyState}>
              <Heart className={styles.emptyIcon} />
              <h3>로그인이 필요합니다</h3>
              <p>좋아요한 의류를 보려면 로그인해주세요.</p>
            </div>
          )
        }

        if (likedClothing.length === 0) {
          return (
            <div className={styles.emptyState}>
              <Heart className={styles.emptyIcon} />
              <h3>좋아요한 의류가 없습니다</h3>
              <p>의류를 좋아요하고 가상 피팅을 시도해보세요!</p>
            </div>
          )
        }

        return (
          <div className={styles.itemsGrid}>
            {likedClothing.map((item) => (
              <div key={item.id} className={styles.gridItem} onClick={() => handleClothingSelect(item)}>
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = "/placeholder.svg?height=200&width=200&text=" + encodeURIComponent(item.name)
                  }}
                />
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                  <div className={styles.itemMeta}>
                    <span className={styles.category}>{item.category}</span>
                    {item.brand && <div className={styles.brand}>{item.brand}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      case "images":
        return (
          <div className={styles.itemsGrid}>
            {userImages.map((item) => (
              <div key={item.id} className={styles.gridItem} onClick={() => handleUserImageSelect(item)}>
                <img src={item.image || "/placeholder.svg"} alt={item.name} />
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                </div>
              </div>
            ))}
          </div>
        )
      case "custom":
        return (
          <div className={styles.itemsGrid}>
            {customClothing.map((item) => (
              <div key={item.id} className={styles.gridItem} onClick={() => handleClothingSelect(item)}>
                <img src={item.image || "/placeholder.svg"} alt={item.name} />
                <div className={styles.itemInfo}>
                  <h4>{item.name}</h4>
                  <div className={styles.itemMeta}>
                    <span className={styles.category}>{item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`${styles.virtualFittingPage} ${darkMode ? "dark-mode" : ""}`}>
      <Header />

      <div className={styles.virtualFittingContainer}>
        {/* 메인 업로드 섹션 */}
        <div className={styles.mainUploadSection}>
          {/* 왼쪽: 사람 이미지 업로드 */}
          <div className={styles.uploadArea}>
            <h2>
              <User className={styles.inlineIcon} /> 사람 이미지
            </h2>
            <div className={styles.imageUploadBox}>
              {selectedPersonImage ? (
                <div className={styles.uploadedImage}>
                  <img
                    src={selectedPersonImage || "/placeholder.svg"}
                    alt="업로드된 사람 이미지"
                    style={{ objectFit: personImageFit }}
                  />
                  <div className={styles.imageControls}>
                    <button
                      className={`${styles.controlBtn} ${styles.changeImageBtn}`}
                      onClick={() => document.getElementById("person-image-input").click()}
                    >
                      변경
                    </button>
                    <button
                      className={`${styles.controlBtn} ${styles.fitToggleBtn} ${styles[personImageFit]}`}
                      onClick={togglePersonImageFit}
                    >
                      {personImageFit === "contain" ? "맞춤" : "채움"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.uploadPlaceholder}
                  onClick={() => document.getElementById("person-image-input").click()}
                >
                  <Camera className={styles.uploadIconSvg} />
                  <p>사람 사진을 업로드하세요</p>
                  <span>클릭하여 이미지 선택</span>
                </div>
              )}
              <input
                id="person-image-input"
                type="file"
                accept="image/*"
                onChange={handlePersonImageUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* 오른쪽: 의류 이미지 업로드 */}
          <div className={styles.uploadArea}>
            <h2>
              <Shirt className={styles.inlineIcon} /> 의류 이미지
            </h2>
            <div className={styles.imageUploadBox}>
              {selectedClothingImage ? (
                <div className={styles.uploadedImage}>
                  <img
                    src={selectedClothingImage || "/placeholder.svg"}
                    alt="업로드된 의류 이미지"
                    style={{ objectFit: clothingImageFit }}
                  />
                  <div className={styles.imageControls}>
                    <button
                      className={`${styles.controlBtn} ${styles.changeImageBtn}`}
                      onClick={() => document.getElementById("clothing-image-input").click()}
                    >
                      변경
                    </button>
                    <button
                      className={`${styles.controlBtn} ${styles.fitToggleBtn} ${styles[clothingImageFit]}`}
                      onClick={toggleClothingImageFit}
                    >
                      {clothingImageFit === "contain" ? "맞춤" : "채움"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.uploadPlaceholder}
                  onClick={() => document.getElementById("clothing-image-input").click()}
                >
                  <Upload className={styles.uploadIconSvg} />
                  <p>의류 사진을 업로드하세요</p>
                  <span>클릭하여 이미지 선택</span>
                </div>
              )}
              <input
                id="clothing-image-input"
                type="file"
                accept="image/*"
                onChange={handleClothingImageUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>
        </div>

        {/* 피팅 버튼 */}
        <div className={styles.fittingButtonSection}>
          <button
            className={styles.fittingBtn}
            onClick={handleVirtualFitting}
            disabled={!selectedPersonImage || !selectedClothingImage}
          >
            가상 피팅 시작하기
          </button>
        </div>

        {/* 하단 탭 섹션 */}
        <div className={styles.bottomSection}>
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tabBtn} ${activeTab === "liked" ? styles.active : ""}`}
              onClick={() => setActiveTab("liked")}
            >
              <Heart className={styles.inlineIcon} /> 좋아요한 의류
              {likedClothingLoading && <span style={{ marginLeft: "0.5rem", color: "var(--accent-color)" }}>...</span>}
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "images" ? styles.active : ""}`}
              onClick={() => setActiveTab("images")}
            >
              <ImageIcon className={styles.inlineIcon} /> 내 이미지
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "custom" ? styles.active : ""}`}
              onClick={() => setActiveTab("custom")}
            >
              <Palette className={styles.inlineIcon} /> 커스터마이징 의류
            </button>
          </div>

          <div className={styles.tabContent}>{renderTabContent()}</div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default VirtualFittingPage

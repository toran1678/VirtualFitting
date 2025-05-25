"use client"

import { useState, useContext } from "react"
import { ThemeContext } from "../context/ThemeContext"
import Header from "../components/Header"
import "../styles/VirtualFittingPage.css"
import { User, Shirt, Heart, ImageIcon, Camera, Upload, Palette } from "lucide-react"

const VirtualFittingPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const [selectedPersonImage, setSelectedPersonImage] = useState(null)
  const [selectedClothingImage, setSelectedClothingImage] = useState(null)
  const [activeTab, setActiveTab] = useState("liked")

  // 더미 데이터
  const likedClothing = [
    {
      id: 1,
      name: "블루 데님 재킷",
      image: "/placeholder.svg?height=200&width=200&text=데님+재킷",
      category: "아우터",
    },
    {
      id: 2,
      name: "화이트 티셔츠",
      image: "/placeholder.svg?height=200&width=200&text=화이트+티셔츠",
      category: "상의",
    },
    {
      id: 3,
      name: "블랙 진",
      image: "/placeholder.svg?height=200&width=200&text=블랙+진",
      category: "하의",
    },
    {
      id: 4,
      name: "스니커즈",
      image: "/placeholder.svg?height=200&width=200&text=스니커즈",
      category: "신발",
    },
    {
      id: 5,
      name: "레드 후디",
      image: "/placeholder.svg?height=200&width=200&text=레드+후디",
      category: "상의",
    },
    {
      id: 6,
      name: "그레이 팬츠",
      image: "/placeholder.svg?height=200&width=200&text=그레이+팬츠",
      category: "하의",
    },
  ]

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "liked":
        return (
          <div className="items-grid">
            {likedClothing.map((item) => (
              <div key={item.id} className="grid-item" onClick={() => handleClothingSelect(item)}>
                <img src={item.image || "/placeholder.svg"} alt={item.name} />
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <span className="category">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        )
      case "images":
        return (
          <div className="items-grid">
            {userImages.map((item) => (
              <div key={item.id} className="grid-item" onClick={() => handleUserImageSelect(item)}>
                <img src={item.image || "/placeholder.svg"} alt={item.name} />
                <div className="item-info">
                  <h4>{item.name}</h4>
                </div>
              </div>
            ))}
          </div>
        )
      case "custom":
        return (
          <div className="items-grid">
            {customClothing.map((item) => (
              <div key={item.id} className="grid-item" onClick={() => handleClothingSelect(item)}>
                <img src={item.image || "/placeholder.svg"} alt={item.name} />
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <span className="category">{item.category}</span>
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
    <div className={`virtual-fitting-page ${darkMode ? "dark-mode" : ""}`}>
      <Header />

      <div className="virtual-fitting-container">
        {/* 메인 업로드 섹션 */}
        <div className="main-upload-section">
          {/* 왼쪽: 사람 이미지 업로드 */}
          <div className="upload-area">
            <h2>
              <User className="inline-icon" /> 사람 이미지
            </h2>
            <div className="image-upload-box">
              {selectedPersonImage ? (
                <div className="uploaded-image">
                  <img src={selectedPersonImage || "/placeholder.svg"} alt="업로드된 사람 이미지" />
                  <button
                    className="change-image-btn"
                    onClick={() => document.getElementById("person-image-input").click()}
                  >
                    이미지 변경
                  </button>
                </div>
              ) : (
                <div
                  className="upload-placeholder"
                  onClick={() => document.getElementById("person-image-input").click()}
                >
                  <Camera className="upload-icon-svg" />
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
          <div className="upload-area">
            <h2>
              <Shirt className="inline-icon" /> 의류 이미지
            </h2>
            <div className="image-upload-box">
              {selectedClothingImage ? (
                <div className="uploaded-image">
                  <img src={selectedClothingImage || "/placeholder.svg"} alt="업로드된 의류 이미지" />
                  <button
                    className="change-image-btn"
                    onClick={() => document.getElementById("clothing-image-input").click()}
                  >
                    이미지 변경
                  </button>
                </div>
              ) : (
                <div
                  className="upload-placeholder"
                  onClick={() => document.getElementById("clothing-image-input").click()}
                >
                  <Upload className="upload-icon-svg" />
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
        <div className="fitting-button-section">
          <button
            className="fitting-btn"
            onClick={handleVirtualFitting}
            disabled={!selectedPersonImage || !selectedClothingImage}
          >
            가상 피팅 시작하기
          </button>
        </div>

        {/* 하단 탭 섹션 */}
        <div className="bottom-section">
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === "liked" ? "active" : ""}`}
              onClick={() => setActiveTab("liked")}
            >
              <Heart className="inline-icon" /> 좋아요한 의류
            </button>
            <button
              className={`tab-btn ${activeTab === "images" ? "active" : ""}`}
              onClick={() => setActiveTab("images")}
            >
              <ImageIcon className="inline-icon" /> 내 이미지
            </button>
            <button
              className={`tab-btn ${activeTab === "custom" ? "active" : ""}`}
              onClick={() => setActiveTab("custom")}
            >
              <Palette className="inline-icon" /> 커스터마이징 의류
            </button>
          </div>

          <div className="tab-content">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  )
}

export default VirtualFittingPage

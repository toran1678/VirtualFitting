"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ThemeContext } from "../../context/ThemeContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { User, Shirt, Heart, ImageIcon, Camera, Upload, Palette, ChevronDown } from 'lucide-react'
import { isLoggedIn } from "../../api/auth"
import { getMyLikedClothes } from "../../api/likedClothes"
import { startVirtualFitting } from "../../api/virtual_fitting"
import styles from "./VirtualFittingPage.module.css"
import {
  getPersonImages,
  getPersonImageUrl,
  handlePersonImageError,
  filterValidPersonImages,
} from "../../api/personImages"
import {
  getUserClothes,
  getClothingImageUrl,
  handleClothingImageError,
  VALID_CATEGORIES,
} from "../../api/userClothesAPI"
import { ShirtIcon } from 'lucide-react'

const VirtualFittingPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  const location = useLocation()
  
  const [selectedPersonImage, setSelectedPersonImage] = useState(null)
  const [selectedClothingImage, setSelectedClothingImage] = useState(null)
  const [selectedClothingData, setSelectedClothingData] = useState(null) // 선택된 의류 데이터
  const [activeTab, setActiveTab] = useState("liked")
  const [likedClothing, setLikedClothing] = useState([])
  const [likedClothingLoading, setLikedClothingLoading] = useState(false)
  const [personImageFit, setPersonImageFit] = useState("contain")
  const [clothingImageFit, setClothingImageFit] = useState("contain")
  const [personImages, setPersonImages] = useState([])
  const [personImagesLoading, setPersonImagesLoading] = useState(false)
  const [myClosetClothes, setMyClosetClothes] = useState([])
  const [myClosetLoading, setMyClosetLoading] = useState(false)
  
  // 카테고리 관련 상태
  const [selectedCategory, setSelectedCategory] = useState(null) // 0: 상체, 1: 하체, 2: 드레스
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 카테고리 매핑 함수
  const mapCategoryToNumber = (categoryName) => {
    if (!categoryName) return null
    
    const category = categoryName.toLowerCase()
    
    // 상체 (0)
    if (category.includes('상의') || 
        category.includes('셔츠') || 
        category.includes('티셔츠') || 
        category.includes('블라우스') || 
        category.includes('탑') || 
        category.includes('아우터') || 
        category.includes('재킷') || 
        category.includes('코트') || 
        category.includes('가디건') || 
        category.includes('후드') || 
        category.includes('맨투맨') || 
        category.includes('니트')) {
      return 0
    }
    
    // 하체 (1)
    if (category.includes('하의') || 
        category.includes('바지') || 
        category.includes('팬츠') || 
        category.includes('진') || 
        category.includes('슬랙스') || 
        category.includes('쇼츠') || 
        category.includes('반바지') || 
        category.includes('스커트')) {
      return 1
    }
    
    // 드레스 (2)
    if (category.includes('원피스') || 
        category.includes('드레스') || 
        category.includes('점프수트') || 
        category.includes('롬퍼')) {
      return 2
    }
    
    return null // 매핑되지 않는 경우
  }

  const getCategoryName = (categoryNumber) => {
    switch (categoryNumber) {
      case 0: return '상체'
      case 1: return '하체'
      case 2: return '드레스'
      default: return '미분류'
    }
  }

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

  // URL 파라미터에서 의류 정보 확인 (나중에 다른 페이지에서 넘어올 때 사용)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const clothingId = params.get('clothingId')
    const clothingImage = params.get('clothingImage')
    const clothingCategory = params.get('clothingCategory')
    
    if (clothingId && clothingImage) {
      setSelectedClothingImage(decodeURIComponent(clothingImage))
      if (clothingCategory) {
        const categoryNum = mapCategoryToNumber(decodeURIComponent(clothingCategory))
        setSelectedCategory(categoryNum)
      }
    }
  }, [location])

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

  // 인물 이미지 데이터 로드
  const loadPersonImages = async () => {
    if (!isLoggedIn()) {
      console.log("로그인이 필요합니다.")
      setPersonImages([])
      return
    }

    setPersonImagesLoading(true)
    try {
      const data = await getPersonImages(1, 50) // 첫 페이지, 최대 50개
      console.log("인물 이미지 API 응답:", data)

      const validImages = filterValidPersonImages(data.images || [])

      // API 응답을 컴포넌트에서 사용할 형태로 변환
      const formattedData = validImages.map((item) => ({
        id: item.id,
        name: item.description || `인물 이미지 ${item.id}`,
        image: getPersonImageUrl(item.image_url),
        created_at: item.created_at,
        description: item.description,
      }))

      setPersonImages(formattedData)
    } catch (error) {
      console.error("인물 이미지 로드 실패:", error)
      setPersonImages([])
    } finally {
      setPersonImagesLoading(false)
    }
  }

  // 내 옷장 의류 데이터 로드
  const loadMyClosetClothes = async () => {
    if (!isLoggedIn()) {
      console.log("로그인이 필요합니다.")
      setMyClosetClothes([])
      return
    }

    setMyClosetLoading(true)
    try {
      const data = await getUserClothes({ page: 1, perPage: 50 })
      console.log("내 옷장 API 응답:", data)

      // API 응답을 컴포넌트에서 사용할 형태로 변환
      const formattedData = data.clothes.map((item) => ({
        id: item.id,
        name: item.name,
        image: getClothingImageUrl(item.image_url),
        category: VALID_CATEGORIES.find(c => c.value === item.category)?.label || item.category,
        brand: item.brand,
        color: item.color,
        season: item.season,
        style: item.style,
      }))

      setMyClosetClothes(formattedData)
    } catch (error) {
      console.error("내 옷장 의류 로드 실패:", error)
      setMyClosetClothes([])
    } finally {
      setMyClosetLoading(false)
    }
  }

  useEffect(() => {
    // 컴포넌트 마운트 시 데이터 로드
    loadLikedClothes()
    loadPersonImages()
    loadMyClosetClothes()
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
        setSelectedClothingData(null) // 직접 업로드한 경우 데이터 초기화
        setSelectedCategory(null) // 카테고리도 초기화
        setShowCategorySelector(true) // 카테고리 선택기 표시
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUserImageSelect = (userImage) => {
    setSelectedPersonImage(userImage.image)
  }

  const handleClothingSelect = (clothing) => {
    setSelectedClothingImage(clothing.image)
    setSelectedClothingData(clothing)
    
    // 카테고리 자동 매핑 시도
    const autoCategory = mapCategoryToNumber(clothing.category)
    if (autoCategory !== null) {
      setSelectedCategory(autoCategory)
      setShowCategorySelector(false) // 자동 매핑 성공 시 선택기 숨김
    } else {
      setSelectedCategory(null)
      setShowCategorySelector(true) // 자동 매핑 실패 시 선택기 표시
    }
  }

  // 이미지 에러 처리 함수 추가 (handleClothingSelect 함수 다음에)
  const handleImageError = (e, title) => {
    e.target.style.display = "none"
    const placeholder = e.target.nextElementSibling
    if (placeholder) {
      placeholder.style.display = "flex"
      placeholder.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style="color: var(--text-secondary); opacity: 0.6;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <span style="font-size: 0.85rem; color: var(--text-secondary); text-align: center;">이미지가 없습니다</span>
        </div>
      `
    }
  }

  const handleVirtualFitting = async () => {
    if (!selectedPersonImage || !selectedClothingImage) {
      alert("인물 이미지와 의류 이미지를 모두 선택해주세요!")
      return
    }

    if (selectedCategory === null) {
      alert("의류 카테고리를 선택해주세요!")
      return
    }

    if (!isLoggedIn()) {
      alert("로그인이 필요합니다!")
      return
    }

    setIsProcessing(true)
    
    try {
      console.log("가상 피팅 시작 준비:", {
        personImageType: selectedPersonImage.startsWith('data:') ? 'Base64' : 'URL',
        clothingImageType: selectedClothingImage.startsWith('data:') ? 'Base64' : 'URL',
        category: selectedCategory,
        categoryName: getCategoryName(selectedCategory)
      })

      // 이미지를 File 객체로 변환
      console.log("인물 이미지 변환 시작...")
      const personImageFile = await urlToFile(selectedPersonImage, 'person-image.jpg')
      console.log("인물 이미지 변환 완료")
      
      console.log("의류 이미지 변환 시작...")
      const clothingImageFile = await urlToFile(selectedClothingImage, 'clothing-image.jpg')
      console.log("의류 이미지 변환 완료")

      console.log("가상 피팅 API 호출 시작...")

      // 가상 피팅 API 호출
      const result = await startVirtualFitting(
        personImageFile,
        clothingImageFile,
        selectedCategory, // 0, 1, 2 중 하나
        "dc", // 기본 모델 타입
        2.0, // 기본 스케일
        4 // 기본 샘플 수
      )

      console.log("가상 피팅 결과:", result)
      alert("가상 피팅이 시작되었습니다! 메인 페이지에서 결과를 확인하세요.")
      
      // 메인 페이지로 이동
      navigate('/virtual-fitting-main')
      
    } catch (error) {
      console.error("가상 피팅 시작 실패:", error)
      alert(`가상 피팅 시작에 실패했습니다: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 이미지를 RGB로 변환하고 압축하는 함수
  const processImageForML = async (imageUrl) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.crossOrigin = 'anonymous' // CORS 설정
      
      img.onload = () => {
        try {
          // 이미지 크기 조정 (최대 1024x1024)
          const maxSize = 1024
          let { width, height } = img
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }
          
          canvas.width = width
          canvas.height = height
          
          // 흰색 배경으로 채우기 (RGBA -> RGB 변환)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height)
          
          // JPEG로 변환 (품질 90%)
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('이미지 변환에 실패했습니다.'))
            }
          }, 'image/jpeg', 0.9)
          
        } catch (error) {
          reject(new Error(`이미지 처리 중 오류: ${error.message}`))
        }
      }
      
      img.onerror = () => {
        reject(new Error('이미지 로드에 실패했습니다.'))
      }
      
      img.src = imageUrl
    })
  }

  // URL을 File 객체로 변환하는 헬퍼 함수 (개선됨)
  const urlToFile = async (url, filename) => {
    try {
      console.log("이미지 변환 시작:", url.substring(0, 100) + "...")
      
      let blob
      
      // Base64 데이터 URL인 경우
      if (url.startsWith('data:')) {
        console.log("Base64 데이터 URL 처리 중...")
        
        // Base64를 blob으로 변환
        const response = await fetch(url)
        const originalBlob = await response.blob()
        
        // 이미지 처리 (RGB 변환 및 압축)
        blob = await processImageForML(url)
        
        console.log("Base64 변환 및 처리 완료, 파일 크기:", blob.size)
        
      } else {
        // 일반 URL인 경우
        console.log("일반 URL 처리 중...")
        
        // 상대 경로인 경우 절대 경로로 변환
        let fullUrl = url
        if (url.startsWith('/')) {
          fullUrl = window.location.origin + url
        }
        
        console.log("최종 URL:", fullUrl)
        
        try {
          // 먼저 프록시 없이 직접 시도
          const response = await fetch(fullUrl, {
            mode: 'cors',
            credentials: 'include'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const originalBlob = await response.blob()
          
          // 이미지 처리 (RGB 변환 및 압축)
          blob = await processImageForML(fullUrl)
          
        } catch (corsError) {
          console.log("CORS 오류 발생, 프록시 방식으로 재시도...")
          
          // CORS 오류 시 이미지를 canvas로 처리
          blob = await processImageForML(fullUrl)
        }
        
        console.log("URL 변환 및 처리 완료, 파일 크기:", blob.size)
      }
      
      // 파일 타입 확인 및 설정
      const fileType = blob.type || 'image/jpeg'
      
      return new File([blob], filename, { type: fileType })
      
    } catch (error) {
      console.error("이미지 변환 상세 오류:", {
        url: url.substring(0, 100) + "...",
        error: error.message,
        stack: error.stack
      })
      
      // 더 구체적인 오류 메시지 제공
      if (error.message.includes('CORS')) {
        throw new Error("이미지 접근 권한 문제가 발생했습니다. 다른 이미지를 시도해보세요.")
      } else if (error.message.includes('404')) {
        throw new Error("이미지를 찾을 수 없습니다.")
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error("네트워크 연결 문제가 발생했습니다.")
      } else if (error.message.includes('로드에 실패')) {
        throw new Error("이미지 로드에 실패했습니다. 이미지 URL을 확인해주세요.")
      } else {
        throw new Error(`이미지 처리에 실패했습니다: ${error.message}`)
      }
    }
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
                  onError={(e) => handleImageError(e, item.name)}
                  style={{ display: "block" }}
                />
                <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                  {item.name}
                </div>
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
        if (personImagesLoading) {
          return (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>내 이미지를 불러오는 중...</p>
            </div>
          )
        }

        if (!isLoggedIn()) {
          return (
            <div className={styles.emptyState}>
              <ImageIcon className={styles.emptyIcon} />
              <h3>로그인이 필요합니다</h3>
              <p>내 이미지를 보려면 로그인해주세요.</p>
            </div>
          )
        }

        if (personImages.length === 0) {
          return (
            <div className={styles.emptyState}>
              <ImageIcon className={styles.emptyIcon} />
              <h3>업로드된 이미지가 없습니다</h3>
              <p>인물 이미지 관리 페이지에서 이미지를 추가해보세요!</p>
            </div>
          )
        }

        return (
          <div className={styles.itemsGrid}>
            {personImages.map((item) => (
              <div key={item.id} className={styles.personImageGridItem} onClick={() => handleUserImageSelect(item)}>
                <img
                  src={item.image || "/placeholder.svg?height=300&width=200&text=No+Image"}
                  alt={item.name}
                  onError={(e) => handlePersonImageError(e, item.name)}
                  style={{ display: "block" }}
                />
                <div className={styles.personImagePlaceholder} style={{ display: "none" }}>
                  {item.name}
                </div>
                <div className={styles.personImageItemInfo}>
                  <h4>{item.name}</h4>
                  <div className={styles.personImageItemMeta}>
                    <span className={styles.personImageCategory}>
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      case "closet":
        if (myClosetLoading) {
          return (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>내 옷장을 불러오는 중...</p>
            </div>
          )
        }

        if (!isLoggedIn()) {
          return (
            <div className={styles.emptyState}>
              <ShirtIcon className={styles.emptyIcon} />
              <h3>로그인이 필요합니다</h3>
              <p>내 옷장을 보려면 로그인해주세요.</p>
            </div>
          )
        }

        if (myClosetClothes.length === 0) {
          return (
            <div className={styles.emptyState}>
              <ShirtIcon className={styles.emptyIcon} />
              <h3>옷장이 비어있습니다</h3>
              <p>내 옷장 페이지에서 의류를 추가해보세요!</p>
            </div>
          )
        }

        return (
          <div className={styles.itemsGrid}>
            {myClosetClothes.map((item) => (
              <div key={item.id} className={styles.gridItem} onClick={() => handleClothingSelect(item)}>
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  onError={(e) => handleClothingImageError(e)}
                  style={{ display: "block" }}
                />
                <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                  {item.name}
                </div>
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
      case "custom":
        return (
          <div className={styles.itemsGrid}>
            {customClothing.map((item) => (
              <div key={item.id} className={styles.gridItem} onClick={() => handleClothingSelect(item)}>
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  onError={(e) => handleImageError(e, item.name)}
                  style={{ display: "block" }}
                />
                <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                  {item.name}
                </div>
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
          {/* 왼쪽: 인물 이미지 업로드 */}
          <div className={styles.uploadArea}>
            <h2>
              <User className={styles.inlineIcon} /> 인물 이미지
            </h2>
            <div className={styles.imageUploadBox}>
              {selectedPersonImage ? (
                <div className={styles.uploadedImage}>
                  <img
                    src={selectedPersonImage || "/placeholder.svg"}
                    alt="업로드된 인물 이미지"
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
                  <p>인물 사진을 업로드하세요</p>
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
            
            {/* 카테고리 정보 표시 */}
            {selectedClothingImage && (
              <div className={styles.categoryInfo}>
                {selectedCategory !== null ? (
                  <div className={styles.categoryDisplay}>
                    <span className={styles.categoryLabel}>카테고리:</span>
                    <span className={styles.categoryValue}>{getCategoryName(selectedCategory)}</span>
                    <button 
                      className={styles.categoryChangeBtn}
                      onClick={() => setShowCategorySelector(true)}
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  <div className={styles.categoryWarning}>
                    <span>⚠️ 카테고리를 선택해주세요</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 선택 모달 */}
        {showCategorySelector && (
          <div className={styles.categoryModal}>
            <div className={styles.categoryModalContent}>
              <h3>의류 카테고리 선택</h3>
              <p>가상 피팅을 위해 의류 카테고리를 선택해주세요.</p>
              <div className={styles.categoryOptions}>
                <button 
                  className={`${styles.categoryOption} ${selectedCategory === 0 ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedCategory(0)
                    setShowCategorySelector(false)
                  }}
                >
                  <Shirt className={styles.categoryIcon} />
                  <span>상체</span>
                  <small>셔츠, 블라우스, 재킷, 아우터 등</small>
                </button>
                <button 
                  className={`${styles.categoryOption} ${selectedCategory === 1 ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedCategory(1)
                    setShowCategorySelector(false)
                  }}
                >
                  <svg className={styles.categoryIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v20l4-4 4 4V2z"/>
                  </svg>
                  <span>하체</span>
                  <small>바지, 스커트, 반바지 등</small>
                </button>
                <button 
                  className={`${styles.categoryOption} ${selectedCategory === 2 ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedCategory(2)
                    setShowCategorySelector(false)
                  }}
                >
                  <svg className={styles.categoryIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                  <span>드레스</span>
                  <small>원피스, 드레스, 점프수트 등</small>
                </button>
              </div>
              <button 
                className={styles.categoryModalClose}
                onClick={() => setShowCategorySelector(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 피팅 버튼 */}
        <div className={styles.fittingButtonSection}>
          <button
            className={styles.fittingBtn}
            onClick={handleVirtualFitting}
            disabled={!selectedPersonImage || !selectedClothingImage || selectedCategory === null || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className={styles.processingSpinner}></div>
                가상 피팅 처리 중...
              </>
            ) : (
              '가상 피팅 시작하기'
            )}
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
              {personImagesLoading && <span style={{ marginLeft: "0.5rem", color: "var(--accent-color)" }}>...</span>}
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "closet" ? styles.active : ""}`}
              onClick={() => setActiveTab("closet")}
            >
              <ShirtIcon className={styles.inlineIcon} /> 내 옷장
              {myClosetLoading && <span style={{ marginLeft: "0.5rem", color: "var(--accent-color)" }}>...</span>}
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

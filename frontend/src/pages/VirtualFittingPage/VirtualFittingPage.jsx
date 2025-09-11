"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ThemeContext } from "../../context/ThemeContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { User, Shirt, Heart, ImageIcon, Camera, Upload, Palette, Download } from 'lucide-react'
import { isLoggedIn } from "../../api/auth"
import { getMyLikedClothes } from "../../api/likedClothes"
import { startVirtualFitting } from "../../api/virtual_fitting"
import styles from "./VirtualFittingPage.module.css"
import { proxyImage } from "../../api/imageProxy"
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
import {
  getMyCustomClothes,
  getCustomClothingImageUrl,
} from "../../api/customClothingAPI"
import { ShirtIcon } from 'lucide-react'

const VirtualFittingPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  const location = useLocation()
   const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
  
  const [selectedPersonImage, setSelectedPersonImage] = useState(null)
  const [selectedClothingImage, setSelectedClothingImage] = useState(null)
  const [selectedClothingData, setSelectedClothingData] = useState(null)
  const [activeTab, setActiveTab] = useState("liked")
  const [likedClothing, setLikedClothing] = useState([])
  const [likedClothingLoading, setLikedClothingLoading] = useState(false)
  const [personImageFit, setPersonImageFit] = useState("contain")
  const [clothingImageFit, setClothingImageFit] = useState("contain")
  const [personImages, setPersonImages] = useState([])
  const [personImagesLoading, setPersonImagesLoading] = useState(false)
  const [myClosetClothes, setMyClosetClothes] = useState([])
  const [myClosetLoading, setMyClosetLoading] = useState(false)
  const [customClothes, setCustomClothes] = useState([])
  const [customClothesLoading, setCustomClothesLoading] = useState(false)
  
  // 카테고리 관련 상태
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 🔥 간단한 상태만 유지
  const [isConverting, setIsConverting] = useState(false)
  const [showDownloadHelper, setShowDownloadHelper] = useState(false)
  const [failedImageUrl, setFailedImageUrl] = useState("")

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
    
    return null
  }

  const getCategoryName = (categoryNumber) => {
    switch (categoryNumber) {
      case 0: return '상체'
      case 1: return '하체'
      case 2: return '드레스'
      default: return '미분류'
    }
  }

  // 커스터마이징 의류 데이터 로드
  const loadCustomClothes = async () => {
    if (!isLoggedIn()) {
      console.log("로그인이 필요합니다.")
      setCustomClothes([])
      return
    }

    setCustomClothesLoading(true)
    try {
      const data = await getMyCustomClothes(1, 50)
      console.log("커스터마이징 의류 API 응답:", data)

      const formattedData = data.custom_clothes.map((item) => ({
        id: item.custom_clothing_id,
        name: item.custom_name,
        image: getCustomClothingImageUrl(item.custom_image_url),
        category: "커스텀", // 커스터마이징 의류는 별도 카테고리
        created_at: item.created_at,
      }))

      console.log("커스터마이징 의류 로드 완료:", formattedData)
      setCustomClothes(formattedData)
    } catch (error) {
      console.error("커스터마이징 의류 로드 실패:", error)
      setCustomClothes([])
    } finally {
      setCustomClothesLoading(false)
    }
  }

  // 🔥 외부 이미지 감지 함수 (origin 기준)
  const isExternalImage = (url) => {
    if (!url || url.startsWith('data:')) return false
    if (url.startsWith('/')) return false // 같은 오리진 상대 경로
    try {
      const to = new URL(url, window.location.href)
      // 프론트(3000)와 오리진이 다르면 전부 프록시 필요
      return to.origin !== window.location.origin
    } catch {
      return true
    }
  }

  // 🔥 간단한 이미지 변환: 캔버스 사용하지 않고 URL만 정규화 (외부 이미지는 프록시)
  const simpleImageConvert = async (imageUrl, imageName) => {
    console.log(`🔄 선택 이미지 처리: ${imageName}`)
    if (!imageUrl) throw new Error('유효하지 않은 이미지 URL')
    // 이미 base64인 경우 그대로 사용
    if (imageUrl.startsWith('data:')) return imageUrl
    // 외부 오리진(현 오리진/백엔드 오리진이 아닌 경우)만 프록시
    if (isExternalImage(imageUrl)) {
      const proxied = await proxyImage(imageUrl)
      return proxied.url
    }
    // 같은 오리진 URL은 그대로 사용
    return imageUrl
  }

  // URL 파라미터에서 의류 정보 확인
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

      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        name: item.product_name,
        image: item.product_image_url,
        category: item.main_category,
        brand: item.brand_name,
      }))

      console.log("좋아요한 의류 로드 완료:", formattedData)
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
      const data = await getPersonImages(1, 50)
      console.log("인물 이미지 API 응답:", data)

      const validImages = filterValidPersonImages(data.images || [])

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

      console.log("내 옷장 로드 완료:", formattedData)
      setMyClosetClothes(formattedData)
    } catch (error) {
      console.error("내 옷장 의류 로드 실패:", error)
      setMyClosetClothes([])
    } finally {
      setMyClosetLoading(false)
    }
  }

  useEffect(() => {
    loadLikedClothes()
    loadPersonImages()
    loadMyClosetClothes()
    loadCustomClothes()
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
        setSelectedClothingData(null)
        setSelectedCategory(null)
        setShowCategorySelector(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // 🔥 의류 이미지 선택 함수 수정
  const handleClothingSelect = async (clothing) => {
    console.log("의류 이미지 선택:", clothing.image)
    console.log("이미지 타입:", isExternalImage(clothing.image) ? '외부 이미지' : '로컬 이미지')
    
    setIsConverting(true)
    
    try {
      const base64Image = await simpleImageConvert(clothing.image, clothing.name)
      setSelectedClothingImage(base64Image)
      setSelectedClothingData(clothing)
      
      const autoCategory = mapCategoryToNumber(clothing.category)
      if (autoCategory !== null) {
        setSelectedCategory(autoCategory)
        setShowCategorySelector(false)
      } else {
        setSelectedCategory(null)
        setShowCategorySelector(true)
      }
      
      console.log("✅ 의류 이미지 변환 성공")
    } catch (error) {
      console.error("❌ 의류 이미지 변환 실패:", error)
      
      // 🔥 외부 이미지 전용 안내 메시지
      if (isExternalImage(clothing.image)) {
        setFailedImageUrl(clothing.image)
        setShowDownloadHelper(true)
        
        alert(`외부 이미지는 브라우저 보안 정책으로 인해 직접 사용할 수 없습니다.\n\n해결 방법:\n1. 우클릭 후 "이미지를 다른 이름으로 저장" 클릭\n2. 다운로드된 이미지를 "의류 이미지" 섹션에서 직접 업로드\n\n이미지 출처: ${new URL(clothing.image).hostname}`)
      } else {
        alert(`이미지 변환에 실패했습니다: ${error.message}`)
      }
    } finally {
      setIsConverting(false)
    }
  }

  // 🔥 인물 이미지 선택 함수도 동일하게 수정
  const handleUserImageSelect = async (userImage) => {
    console.log("인물 이미지 선택:", userImage.image)
    console.log("이미지 타입:", isExternalImage(userImage.image) ? '외부 이미지' : '로컬 이미지')
    
    setIsConverting(true)
    
    try {
      const base64Image = await simpleImageConvert(userImage.image, userImage.name)
      setSelectedPersonImage(base64Image)
      console.log("✅ 인물 이미지 변환 성공")
    } catch (error) {
      console.error("❌ 인물 이미지 변환 실패:", error)
      
      // 🔥 외부 이미지 전용 안내 메시지
      if (isExternalImage(userImage.image)) {
        setFailedImageUrl(userImage.image)
        setShowDownloadHelper(true)
        
        alert(`외부 이미지는 브라우저 보안 정책으로 인해 직접 사용할 수 없습니다.\n\n📍 해결 방법:\n1. 아래 "이미지 다운로드" 버튼 클릭\n2. 다운로드된 이미지를 "인물 이미지" 섹션에서 직접 업로드\n\n🔗 이미지 출처: ${new URL(userImage.image).hostname}`)
      } else {
        alert(`이미지 변환에 실패했습니다: ${error.message}`)
      }
    } finally {
      setIsConverting(false)
    }
  }

  // 🔥 이미지 다운로드 도우미
  const handleDownloadImage = () => {
    const link = document.createElement('a')
    link.href = failedImageUrl
    link.download = 'image.jpg'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowDownloadHelper(false)
    setFailedImageUrl("")
  }

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
      console.log("=== 가상 피팅 시작 ===")
      console.log("카테고리:", selectedCategory, getCategoryName(selectedCategory))

      console.log("인물 이미지 변환 시작...")
      const personImageFile = await urlToFile(selectedPersonImage, 'person-image.jpg')
      console.log("인물 이미지 변환 완료:", personImageFile.size, "bytes")
      
      console.log("의류 이미지 변환 시작...")
      const clothingImageFile = await urlToFile(selectedClothingImage, 'clothing-image.jpg')
      console.log("의류 이미지 변환 완료:", clothingImageFile.size, "bytes")

      console.log("가상 피팅 API 호출 시작...")

      const result = await startVirtualFitting(
        personImageFile,
        clothingImageFile,
        selectedCategory,
        "dc",
        2.0,
        4
      )

      console.log("가상 피팅 결과:", result)
      alert("가상 피팅이 시작되었습니다! 메인 페이지에서 결과를 확인하세요.")
      
      navigate('/virtual-fitting-main')
      
    } catch (error) {
      console.error("가상 피팅 시작 실패:", error)
      alert(`가상 피팅 시작에 실패했습니다: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 🔥 urlToFile: base64, blob:, http(s), /uploads 모두 지원
  const urlToFile = async (url, filename) => {
    try {
      let fetchUrl = url
      // data:는 그대로, 나머지는 프론트 오리진과 다르면 프록시 경유
      if (url && !url.startsWith('data:')) {
        const to = new URL(url, window.location.href)
        if (to.origin !== window.location.origin) {
          const proxied = await proxyImage(to.href) // 이미 쓰고 있는 프록시 API
          fetchUrl = proxied.url
        }
      }
      const res = await fetch(fetchUrl, { credentials: 'omit' })
      const blob = await res.blob()
      const type = blob.type || 'image/jpeg'
      return new File([blob], filename, { type })
    } catch (error) {
      throw new Error(`파일 변환 실패: ${error.message}`)
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
        if (customClothesLoading) {
          return (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>커스터마이징 의류를 불러오는 중...</p>
            </div>
          )
        }

        if (!isLoggedIn()) {
          return (
            <div className={styles.emptyState}>
              <Palette className={styles.emptyIcon} />
              <h3>로그인이 필요합니다</h3>
              <p>커스터마이징 의류를 보려면 로그인해주세요.</p>
            </div>
          )
        }

        if (customClothes.length === 0) {
          return (
            <div className={styles.emptyState}>
              <Palette className={styles.emptyIcon} />
              <h3>커스터마이징 의류가 없습니다</h3>
              <p>의류 커스터마이징 페이지에서 나만의 의류를 만들어보세요!</p>
            </div>
          )
        }

        return (
          <div className={styles.itemsGrid}>
            {customClothes.map((item) => (
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
                    <div className={styles.date}>
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </div>
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
        {/* 간단한 변환 상태 표시 */}
        {isConverting && (
          <div style={{
            background: darkMode ? '#2a2a2a' : '#f0f8ff',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '16px',
            margin: '16px 0',
            textAlign: 'center',
            fontWeight: 'bold',
            color: darkMode ? '#fff' : '#333'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #4CAF50',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>이미지 변환 중...</span>
            </div>
          </div>
        )}

        {/* 🔥 다운로드 도우미 */}
        {showDownloadHelper && (
          <div style={{
            background: darkMode ? '#2a2a2a' : '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '20px',
            margin: '16px 0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>외부 이미지 보안 제한</h3>
            <p style={{ margin: '0 0 10px 0', color: '#856404' }}>
              <strong>{new URL(failedImageUrl).hostname}</strong> 도메인의 이미지는<br/>
              브라우저 CORS 정책으로 인해 직접 변환할 수 없습니다.
            </p>
            <div style={{ 
              background: darkMode ? '#1a1a1a' : '#f8f9fa', 
              padding: '10px', 
              borderRadius: '5px', 
              margin: '10px 0',
              fontSize: '14px',
              color: '#495057'
            }}>
              <strong>해결 방법:</strong><br/>
              1. 아래 버튼으로 이미지 다운로드<br/>
              2. 상단 "의류 이미지" 또는 "인물 이미지" 섹션에서 직접 업로드
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleDownloadImage}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}
              >
                <Download size={18} />
                이미지 다운로드
              </button>
              <button
                onClick={() => setShowDownloadHelper(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}

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
            disabled={!selectedPersonImage || !selectedClothingImage || selectedCategory === null || isProcessing || isConverting}
          >
            {isProcessing ? (
              <>
                <div className={styles.processingSpinner}></div>
                가상 피팅 처리 중...
              </>
            ) : isConverting ? (
              <>
                <div className={styles.processingSpinner}></div>
                이미지 변환 중...
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
              {customClothesLoading && <span style={{ marginLeft: "0.5rem", color: "var(--accent-color)" }}>...</span>}
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

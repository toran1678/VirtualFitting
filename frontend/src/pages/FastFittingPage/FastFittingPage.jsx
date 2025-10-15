"use client"

import { useState, useContext, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ThemeContext } from "../../context/ThemeContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { Play, ImageIcon, RefreshCw, X, Zap, Shirt, Sparkles, Plus } from 'lucide-react'
import { isLoggedIn } from "../../api/auth"
import { 
  getMyLikedClothes
} from "../../api/likedClothes"
import { 
  getMyCustomClothes,
  getCustomClothingImageUrl
} from "../../api/customClothingAPI"
import { 
  getPersonImages,
  getPersonImageUrl,
  filterValidPersonImages,
} from "../../api/personImages"
import { 
  getUserClothes,
  getClothingImageUrl
} from "../../api/userClothesAPI"
import styles from "./FastFittingPage.module.css"

const FastFittingPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  
  // 상태 관리
  const [selectedTab, setSelectedTab] = useState("좋아요한 의류")
  const [selectedPersonImage, setSelectedPersonImage] = useState(null)
  const [selectedClothes, setSelectedClothes] = useState({
    upper: null,
    lower: null
  })
  const [fittingType, setFittingType] = useState("상의") // 상의, 하의, 드레스, 상의+하의
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // 데이터 상태
  const [likedClothes, setLikedClothes] = useState([])
  const [customClothes, setCustomClothes] = useState([])
  const [personImages, setPersonImages] = useState([])
  const [userClothes, setUserClothes] = useState([])
  
  // 로딩 상태
  const [likedClothesLoading, setLikedClothesLoading] = useState(false)
  const [customClothesLoading, setCustomClothesLoading] = useState(false)
  const [personImagesLoading, setPersonImagesLoading] = useState(false)
  const [myClosetLoading, setMyClosetLoading] = useState(false)
  
  // 직접 사진 첨부 관련 상태
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("상의")
  const [uploadedPersonImage, setUploadedPersonImage] = useState(null)

  // 탭 데이터
  const tabs = ["좋아요한 의류", "내 옷장", "커스터마이징 의류"]
  
  // 카테고리 옵션
  const categoryOptions = ["상의", "하의", "드레스"]
  
  // 데이터 로드 함수들
  const loadLikedClothes = useCallback(async () => {
    if (!isLoggedIn()) {
      setLikedClothes([])
      return
    }

    setLikedClothesLoading(true)
    try {
      const data = await getMyLikedClothes()

      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        name: item.product_name || item.product_title || "상품명 없음",
        image: item.product_image_url,
        category: item.main_category || "상의",
        brand: item.brand_name || "브랜드 없음",
        clothing_id: item.clothing_id,
        product_image_url: item.product_image_url,
        product_name: item.product_name || item.product_title || "상품명 없음",
        brand_name: item.brand_name || "브랜드 없음",
        main_category: item.main_category || "상의",
        sub_category: item.sub_category || "기본"
      }))

      setLikedClothes(formattedData)
    } catch (error) {
      console.error("좋아요한 의류 로드 실패:", error)
      setLikedClothes([])
    } finally {
      setLikedClothesLoading(false)
    }
  }, [])

  const loadCustomClothes = useCallback(async () => {
    if (!isLoggedIn()) {
      setCustomClothes([])
      return
    }

    setCustomClothesLoading(true)
    try {
      const data = await getMyCustomClothes(1, 50)

      const formattedData = data.custom_clothes.map((item) => ({
        id: item.custom_clothing_id,
        name: item.custom_name,
        image: getCustomClothingImageUrl(item.custom_image_url),
        category: item.main_category || "상의", // 기본값을 상의로 설정
        brand: "커스텀",
        custom_clothing_id: item.custom_clothing_id,
        custom_image_url: item.custom_image_url,
        custom_name: item.custom_name,
        main_category: item.main_category || "상의",
        sub_category: item.sub_category || "기본"
      }))

      setCustomClothes(formattedData)
    } catch (error) {
      console.error("커스터마이징 의류 로드 실패:", error)
      setCustomClothes([])
    } finally {
      setCustomClothesLoading(false)
    }
  }, [])

  const loadPersonImages = useCallback(async () => {
    if (!isLoggedIn()) {
      setPersonImages([])
      return
    }

    setPersonImagesLoading(true)
    try {
      const data = await getPersonImages(1, 50)

      const validImages = filterValidPersonImages(data.images || [])

      const formattedData = validImages.map((item) => ({
        id: item.id,
        name: item.description || `인물 이미지 ${item.id}`,
        image: getPersonImageUrl(item.image_url),
        created_at: item.created_at,
        description: item.description,
        person_image_id: item.id,
        person_image_url: item.image_url,
        person_name: item.description || `인물 이미지 ${item.id}`
      }))

      setPersonImages(formattedData)
    } catch (error) {
      console.error("인물 이미지 로드 실패:", error)
      setPersonImages([])
    } finally {
      setPersonImagesLoading(false)
    }
  }, [])

  const loadUserClothes = useCallback(async () => {
    if (!isLoggedIn()) {
      setUserClothes([])
      return
    }

    setMyClosetLoading(true)
    try {
      const data = await getUserClothes({ page: 1, perPage: 50 })

      // 카테고리 매핑 함수
      const mapCategoryToKorean = (category) => {
        if (!category) return "상의"
        
        const categoryLower = category.toLowerCase()
        
        // 상의 카테고리
        if (categoryLower.includes('top') || categoryLower.includes('shirt') || 
            categoryLower.includes('blouse') || categoryLower.includes('hoodie') ||
            categoryLower.includes('sweater') || categoryLower.includes('jacket') ||
            categoryLower.includes('coat') || categoryLower.includes('cardigan') ||
            categoryLower.includes('t-shirt') || categoryLower.includes('tshirt')) {
          return "상의"
        }
        
        // 하의 카테고리
        if (categoryLower.includes('bottom') || categoryLower.includes('pants') ||
            categoryLower.includes('jeans') || categoryLower.includes('skirt') ||
            categoryLower.includes('shorts') || categoryLower.includes('trouser')) {
          return "하의"
        }
        
        // 드레스 카테고리
        if (categoryLower.includes('dress') || categoryLower.includes('onepiece')) {
          return "드레스"
        }
        
        // 기본값
        return "상의"
      }

      const formattedData = data.clothes.map((item) => ({
        id: item.id,
        name: item.name,
        image: getClothingImageUrl(item.image_url),
        category: mapCategoryToKorean(item.category),
        brand: item.brand,
        color: item.color,
        season: item.season,
        style: item.style,
        user_clothing_id: item.id,
        clothing_image_url: item.image_url,
        clothing_name: item.name,
        brand_name: item.brand,
        main_category: mapCategoryToKorean(item.category),
        sub_category: item.category
      }))

      setUserClothes(formattedData)
    } catch (error) {
      console.error("내 옷장 의류 로드 실패:", error)
      setUserClothes([])
    } finally {
      setMyClosetLoading(false)
    }
  }, [])

  // 초기 데이터 로드
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login")
      return
    }

    const loadAllData = async () => {
      setLoading(true)
      await Promise.all([
        loadLikedClothes(),
        loadCustomClothes(),
        loadPersonImages(),
        loadUserClothes()
      ])
      setLoading(false)
    }

    loadAllData()
  }, [loadLikedClothes, loadCustomClothes, loadPersonImages, loadUserClothes, navigate])

  // 현재 탭의 의류 데이터 가져오기
  const getCurrentClothes = () => {
    switch (selectedTab) {
      case "좋아요한 의류":
        return likedClothes
      case "내 옷장":
        return userClothes
      case "커스터마이징 의류":
        return customClothes
      default:
        return []
    }
  }

  // 의류 선택 핸들러
  const handleClothingSelect = (clothing) => {
    const category = clothing.main_category?.toLowerCase() || clothing.category?.toLowerCase() || ""
    
    // 소스 타입 결정
    let source = "liked"
    if (selectedTab === "내 옷장") {
      source = "closet"
    } else if (selectedTab === "커스터마이징 의류") {
      source = "custom"
    }
    
    // 의류에 source 정보 추가
    const clothingWithSource = { ...clothing, source }
    
    // 현재 피팅 타입에 따라 의류 선택 제한
    if (fittingType === "상의") {
      // 상의만 선택 가능
      if (category.includes("상의") || category.includes("셔츠") || category.includes("티셔츠") || 
          category.includes("블라우스") || category.includes("가디건") || category.includes("재킷") ||
          category.includes("상체") || category.includes("후드") || category.includes("맨투맨") ||
          category.includes("아우터") || category.includes("코트")) {
        setSelectedClothes({ upper: clothingWithSource, lower: null })
      } else {
        alert("상의 피팅을 선택했으므로 상의만 선택할 수 있습니다.")
        return
      }
    } else if (fittingType === "하의") {
      // 하의만 선택 가능
      if (category.includes("하의") || category.includes("바지") || category.includes("치마") || 
          category.includes("팬츠") || category.includes("데님") || category.includes("하체") ||
          category.includes("스커트") || category.includes("반바지")) {
        setSelectedClothes({ upper: null, lower: clothingWithSource })
      } else {
        alert("하의 피팅을 선택했으므로 하의만 선택할 수 있습니다.")
        return
      }
    } else if (fittingType === "드레스") {
      // 드레스만 선택 가능
      if (category.includes("드레스") || category.includes("원피스")) {
        setSelectedClothes({ upper: clothingWithSource, lower: clothingWithSource })
      } else {
        alert("드레스 피팅을 선택했으므로 드레스만 선택할 수 있습니다.")
        return
      }
    } else if (fittingType === "상의+하의") {
      // 상의와 하의 모두 선택 가능
      if (category.includes("상의") || category.includes("셔츠") || category.includes("티셔츠") || 
          category.includes("블라우스") || category.includes("가디건") || category.includes("재킷") ||
          category.includes("상체") || category.includes("후드") || category.includes("맨투맨") ||
          category.includes("아우터") || category.includes("코트")) {
        setSelectedClothes(prev => ({ ...prev, upper: clothingWithSource }))
      } else if (category.includes("하의") || category.includes("바지") || category.includes("치마") || 
                 category.includes("팬츠") || category.includes("데님") || category.includes("하체") ||
                 category.includes("스커트") || category.includes("반바지")) {
        setSelectedClothes(prev => ({ ...prev, lower: clothingWithSource }))
      } else {
        alert("상의+하의 피팅을 선택했으므로 상의나 하의만 선택할 수 있습니다.")
        return
      }
    }
  }

  // 가상 피팅 실행
  const handleVirtualFitting = async () => {
    if (!selectedPersonImage) {
      alert("인물 이미지를 선택해주세요.")
      return
    }

    if (fittingType === "상의+하의") {
      if (!selectedClothes.upper || !selectedClothes.lower) {
        alert("상의와 하의를 모두 선택해주세요.")
        return
      }
    } else if (fittingType === "상의") {
      if (!selectedClothes.upper) {
        alert("상의를 선택해주세요.")
        return
      }
    } else if (fittingType === "하의") {
      if (!selectedClothes.lower) {
        alert("하의를 선택해주세요.")
        return
      }
    } else if (fittingType === "드레스") {
      if (!selectedClothes.upper && !selectedClothes.lower) {
        alert("드레스를 선택해주세요.")
        return
      }
    }

    setProcessing(true)
    try {
      // 백엔드 API 호출
      const API_BASE_URL = process.env.REACT_APP_API_URL || ""
      
      // FormData 생성 (직접 첨부한 이미지 처리)
      const formData = new FormData()
      
      // 인물 이미지 추가
      if (selectedPersonImage.type === 'uploaded' && selectedPersonImage.file) {
        // 직접 첨부한 이미지
        formData.append("person_image", selectedPersonImage.file)
      } else if (selectedPersonImage.id) {
        // DB에 저장된 이미지
        formData.append("person_image_id", selectedPersonImage.id)
      }
      
      // 카테고리 한글 → 영어 변환 함수
      const convertCategoryToEnglish = (koreanCategory) => {
        const categoryMap = {
          "상의": "upper_body",
          "하의": "lower_body",
          "드레스": "dresses"
        }
        return categoryMap[koreanCategory] || "upper_body"
      }
      
      // 의류 이미지 추가
      if (selectedClothes.upper?.type === 'uploaded' && selectedClothes.upper.file) {
        formData.append("upper_cloth_image", selectedClothes.upper.file)
        formData.append("upper_category", convertCategoryToEnglish(selectedClothes.upper.category))
      } else if (selectedClothes.upper?.id) {
        formData.append("upper_clothing_id", selectedClothes.upper.id)
        // 소스 타입 전달 (좋아요한 의류, 내 옷장, 커스터마이징 의류 구분)
        formData.append("upper_clothing_source", selectedClothes.upper.source || "liked")
      }
      
      if (selectedClothes.lower?.type === 'uploaded' && selectedClothes.lower.file) {
        formData.append("lower_cloth_image", selectedClothes.lower.file)
        formData.append("lower_category", convertCategoryToEnglish(selectedClothes.lower.category))
      } else if (selectedClothes.lower?.id) {
        formData.append("lower_clothing_id", selectedClothes.lower.id)
        // 소스 타입 전달 (좋아요한 의류, 내 옷장, 커스터마이징 의류 구분)
        formData.append("lower_clothing_source", selectedClothes.lower.source || "liked")
      }
      
      formData.append("fitting_type", fittingType)
      formData.append("garment_description", "Fast virtual fitting")
      
      const response = await fetch(`${API_BASE_URL}/api/fast-fitting/start`, {
        method: "POST",
        credentials: "include",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "가상 피팅 시작에 실패했습니다.")
      }

      const result = await response.json()
      alert(result.message || "가상 피팅이 시작되었습니다!")
      
      // 가상 피팅 메인 페이지로 이동
      navigate("/virtual-fitting-main")
      
    } catch (error) {
      console.error("가상 피팅 오류:", error)
      const errorMessage = error.message || "가상 피팅에 실패했습니다."
      
      // GPU 할당량 오류인 경우 특별한 안내
      if (errorMessage.includes("GPU quota") || errorMessage.includes("할당량")) {
        alert("⚠️ " + errorMessage + "\n\n💡 Hugging Face의 무료 GPU 할당량이 소진되었습니다.\n약 1시간 후에 다시 시도하거나, 유료 플랜을 고려해보세요.")
      } else {
        alert("가상 피팅에 실패했습니다: " + errorMessage)
      }
    } finally {
      setProcessing(false)
    }
  }

  // 인물 이미지 직접 첨부 핸들러
  const handlePersonImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const personData = {
          id: `uploaded_person_${Date.now()}`,
          person_image_id: `uploaded_person_${Date.now()}`,
          name: file.name,
          image: e.target.result,
          file: file,
          type: 'uploaded'
        }
        setUploadedPersonImage(personData)
        setSelectedPersonImage(personData)
      }
      reader.readAsDataURL(file)
    }
  }

  // 직접 사진 첨부 핸들러
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage({
          file: file,
          preview: e.target.result,
          name: file.name
        })
        setShowUploadModal(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // 직접 첨부한 이미지 선택 핸들러
  const handleUploadedImageSelect = () => {
    if (!uploadedImage) return

    const clothingData = {
      id: `uploaded_${Date.now()}`,
      name: uploadedImage.name,
      image: uploadedImage.preview,
      category: selectedCategory,
      brand: "직접 첨부",
      type: 'uploaded',
      file: uploadedImage.file // 파일 정보 저장
    }

    // 현재 피팅 타입에 따라 카테고리 제한
    if (fittingType === "상의" && selectedCategory !== "상의") {
      alert("상의 피팅을 선택했으므로 상의 카테고리만 선택할 수 있습니다.")
      return
    } else if (fittingType === "하의" && selectedCategory !== "하의") {
      alert("하의 피팅을 선택했으므로 하의 카테고리만 선택할 수 있습니다.")
      return
    } else if (fittingType === "드레스" && selectedCategory !== "드레스") {
      alert("드레스 피팅을 선택했으므로 드레스 카테고리만 선택할 수 있습니다.")
      return
    } else if (fittingType === "상의+하의" && selectedCategory === "드레스") {
      alert("상의+하의 피팅을 선택했으므로 드레스는 선택할 수 없습니다.")
      return
    }

    // 카테고리에 따라 의류 선택
    if (selectedCategory === "상의") {
      setSelectedClothes(prev => ({ ...prev, upper: clothingData, lower: prev.lower }))
    } else if (selectedCategory === "하의") {
      setSelectedClothes(prev => ({ ...prev, upper: prev.upper, lower: clothingData }))
    } else if (selectedCategory === "드레스") {
      // 드레스는 상의와 하의를 모두 선택한 것으로 처리
      setSelectedClothes({ upper: clothingData, lower: clothingData })
    }

    setShowUploadModal(false)
    setUploadedImage(null)
    setSelectedCategory("상의")
  }


  // 선택된 의류 제거
  const handleRemoveClothing = (type) => {
    setSelectedClothes(prev => ({
      ...prev,
      [type]: null
    }))
  }

  // 피팅 타입 변경
  const handleFittingTypeChange = (type) => {
    setFittingType(type)
    // 피팅 타입 변경 시 의류 선택 초기화
    setSelectedClothes({ upper: null, lower: null })
  }

  if (loading) {
    return (
      <div className={`${styles.fastFittingPage} ${darkMode ? styles.darkMode : ""}`}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>데이터를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isLoggedIn()) {
    return (
      <div className={`${styles.fastFittingPage} ${darkMode ? styles.darkMode : ""}`}>
        <Header />
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <ImageIcon className={styles.emptyIcon} />
            <h2>로그인이 필요합니다</h2>
            <p>빠른 가상 피팅 서비스를 이용하려면 로그인해주세요.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const currentClothes = getCurrentClothes()

  return (
    <div className={`${styles.fastFittingPage} ${darkMode ? styles.darkMode : ""}`}>
      <Header />
      
      <div className={styles.container}>
        {/* 헤더 섹션 */}
        <div className={styles.headerSection}>
          <h1>
            <Zap className={styles.headerIcon} />
            빠른 가상 피팅
          </h1>
          <p>허깅페이스 AI로 빠르게 가상 피팅을 체험해보세요</p>
        </div>

        {/* 인물 이미지 선택 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <ImageIcon className={styles.sectionIcon} />
              인물 이미지 선택
            </h2>
            
            {/* 인물 이미지 직접 첨부 버튼 */}
            <div className={styles.personUploadSection}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePersonImageUpload}
                style={{ display: 'none' }}
                id="person-image-upload"
              />
              <label htmlFor="person-image-upload" className={styles.personUploadBtn}>
                <Plus size={16} />
                직접 사진 첨부
              </label>
            </div>
          </div>
          
          {personImagesLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw className={styles.loadingIcon} />
              <p>인물 이미지를 불러오는 중...</p>
            </div>
          ) : personImages.length === 0 && !uploadedPersonImage ? (
            <div className={styles.emptyState}>
              <ImageIcon className={styles.emptyIcon} />
              <h3>등록된 인물 이미지가 없습니다</h3>
              <p>인물 이미지 관리 페이지에서 이미지를 등록해주세요.</p>
              <button 
                className={styles.primaryBtn}
                onClick={() => navigate("/person-image-manage")}
              >
                인물 이미지 관리
              </button>
            </div>
          ) : (
            <div className={styles.personImageGrid}>
              {/* 직접 첨부한 인물 이미지가 있으면 표시 */}
              {uploadedPersonImage && (
                <div 
                  key={uploadedPersonImage.id} 
                  className={`${styles.personImageCard} ${selectedPersonImage?.type === 'uploaded' ? styles.selected : ''}`}
                  onClick={() => setSelectedPersonImage(uploadedPersonImage)}
                >
                  <img 
                    src={uploadedPersonImage.image} 
                    alt="직접 첨부한 인물 이미지"
                    className={styles.personImage}
                  />
                  <div className={styles.personImageOverlay}>
                    <span className={styles.personImageName}>
                      직접 첨부
                    </span>
                  </div>
                </div>
              )}
              
              {/* 기존 인물 이미지들 */}
              {personImages.map((person) => (
                <div 
                  key={person.person_image_id} 
                  className={`${styles.personImageCard} ${
                    selectedPersonImage?.person_image_id === person.person_image_id && selectedPersonImage?.type === 'existing' ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedPersonImage({...person, type: 'existing'})}
                >
                  <img 
                    src={getPersonImageUrl(person.person_image_url)} 
                    alt="인물 이미지"
                    className={styles.personImage}
                  />
                  <div className={styles.personImageOverlay}>
                    <span className={styles.personImageName}>
                      {person.person_name || `인물 #${person.person_image_id}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 의류 선택 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <Shirt className={styles.sectionIcon} />
              의류 선택
            </h2>
            
            {/* 직접 사진 첨부 버튼 */}
            <div className={styles.uploadSection}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="clothing-upload"
                disabled={!fittingType}
              />
              <label 
                htmlFor="clothing-upload" 
                className={`${styles.uploadBtn} ${!fittingType ? styles.disabled : ''}`}
              >
                <Plus size={16} />
                직접 사진 첨부
              </label>
            </div>
          </div>

          {/* 피팅 타입 선택 */}
          <div className={styles.fittingTypeSelector}>
            <button 
              className={`${styles.fittingTypeBtn} ${fittingType === "상의" ? styles.active : ''}`}
              onClick={() => handleFittingTypeChange("상의")}
            >
              <Shirt size={20} />
              상의
            </button>
            <button 
              className={`${styles.fittingTypeBtn} ${fittingType === "하의" ? styles.active : ''}`}
              onClick={() => handleFittingTypeChange("하의")}
            >
              <svg className={styles.categoryIcon} width="20" height="20" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                <path d="M12 19H16.4363C16.7532 19 17.0154 18.7536 17.0352 18.4374L17.9602 3.63743C17.9817 3.29201 17.7074 3 17.3613 3H6.63426C6.28981 3 6.01608 3.28936 6.03518 3.63328L6.96852 20.4333C6.98618 20.7512 7.24915 21 7.56759 21H11.4C11.7314 21 12 20.7314 12 20.4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              하의
            </button>
            <button 
              className={`${styles.fittingTypeBtn} ${fittingType === "드레스" ? styles.active : ''}`}
              onClick={() => handleFittingTypeChange("드레스")}
            >
              <svg className={styles.categoryIcon} width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                <path d="M18 21H6C6 21 7.66042 16.1746 7.5 13C7.3995 11.0112 5.97606 9.92113 6.5 8C6.72976 7.15753 7.5 6 7.5 6C7.5 6 9 7 12 7C15 7 16.5 6 16.5 6C16.5 6 17.2702 7.15753 17.5 8C18.0239 9.92113 16.6005 11.0112 16.5 13C16.3396 16.1746 18 21 18 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.49988 6.00002V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.5 6.00002V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              드레스
            </button>
            <button 
              className={`${styles.fittingTypeBtn} ${fittingType === "상의+하의" ? styles.active : ''}`}
              onClick={() => handleFittingTypeChange("상의+하의")}
            >
              <Sparkles size={20} />
              상의 + 하의
            </button>
          </div>

          {/* 선택된 의류 표시 */}
          <div className={styles.selectedClothesContainer}>
            {fittingType === "드레스" ? (
              // 드레스인 경우 하나만 표시
              <div className={styles.selectedClothing}>
                {selectedClothes.upper || selectedClothes.lower ? (
                  <>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => {
                        setSelectedClothes({ upper: null, lower: null })
                      }}
                    >
                      <X size={16} />
                    </button>
                    <div className={styles.selectedClothingImageWrapper}>
                      <img 
                        src={(selectedClothes.upper || selectedClothes.lower).image} 
                        alt={(selectedClothes.upper || selectedClothes.lower).name || (selectedClothes.upper || selectedClothes.lower).title}
                        className={styles.selectedClothingImage}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.placeholderClothing}>
                    <Shirt size={32} className={styles.placeholderIcon} />
                    <span className={styles.placeholderText}>드레스를 선택해주세요</span>
                  </div>
                )}
              </div>
            ) : (
              // 상의, 하의, 상의+하의인 경우
              <>
                {/* 상의 선택 영역 */}
                {(fittingType === "상의" || fittingType === "상의+하의") && (
                  <div className={styles.selectedClothing}>
                    {selectedClothes.upper ? (
                      <>
                        <button 
                          className={styles.removeBtn}
                          onClick={() => handleRemoveClothing("upper")}
                        >
                          <X size={16} />
                        </button>
                        <div className={styles.selectedClothingImageWrapper}>
                          <img 
                            src={selectedClothes.upper.image} 
                            alt={selectedClothes.upper.name || selectedClothes.upper.title}
                            className={styles.selectedClothingImage}
                          />
                        </div>
                      </>
                    ) : (
                      <div className={styles.placeholderClothing}>
                        <Shirt size={32} className={styles.placeholderIcon} />
                        <span className={styles.placeholderText}>상의를 선택해주세요</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 하의 선택 영역 */}
                {(fittingType === "하의" || fittingType === "상의+하의") && (
                  <div className={styles.selectedClothing}>
                    {selectedClothes.lower ? (
                      <>
                        <button 
                          className={styles.removeBtn}
                          onClick={() => handleRemoveClothing("lower")}
                        >
                          <X size={16} />
                        </button>
                        <div className={styles.selectedClothingImageWrapper}>
                          <img 
                            src={selectedClothes.lower.image} 
                            alt={selectedClothes.lower.name || selectedClothes.lower.title}
                            className={styles.selectedClothingImage}
                          />
                        </div>
                      </>
                    ) : (
                      <div className={styles.placeholderClothing}>
                        <svg className={styles.placeholderIcon} width="32" height="32" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                          <path d="M12 19H16.4363C16.7532 19 17.0154 18.7536 17.0352 18.4374L17.9602 3.63743C17.9817 3.29201 17.7074 3 17.3613 3H6.63426C6.28981 3 6.01608 3.28936 6.03518 3.63328L6.96852 20.4333C6.98618 20.7512 7.24915 21 7.56759 21H11.4C11.7314 21 12 20.7314 12 20.4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={styles.placeholderText}>하의를 선택해주세요</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 의류 탭 */}
          <div className={styles.clothingTabs}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`${styles.clothingTab} ${selectedTab === tab ? styles.active : ''}`}
                onClick={() => setSelectedTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 의류 목록 */}
          {(() => {
            const isLoading = selectedTab === "좋아요한 의류" ? likedClothesLoading :
                            selectedTab === "내 옷장" ? myClosetLoading :
                            selectedTab === "커스터마이징 의류" ? customClothesLoading : false
            
            if (isLoading) {
              return (
                <div className={styles.loadingState}>
                  <RefreshCw className={styles.loadingIcon} />
                  <p>{selectedTab}을 불러오는 중...</p>
                </div>
              )
            }
            
            if (currentClothes.length === 0) {
              return (
                <div className={styles.emptyState}>
                  <ImageIcon className={styles.emptyIcon} />
                  <h3>의류가 없습니다</h3>
                  <p>{selectedTab}에 등록된 의류가 없습니다.</p>
                </div>
              )
            }
            
            return (
            <div className={styles.clothingGrid}>
              {currentClothes.map((clothing) => (
                <div 
                  key={clothing.id} 
                    className={`${styles.clothingCard} ${
                      (fittingType === "상의" && selectedClothes.upper?.id === clothing.id) ||
                      (fittingType === "하의" && selectedClothes.lower?.id === clothing.id) ||
                      (fittingType === "드레스" && (selectedClothes.upper?.id === clothing.id || selectedClothes.lower?.id === clothing.id)) ||
                      (fittingType === "상의+하의" && (selectedClothes.upper?.id === clothing.id || selectedClothes.lower?.id === clothing.id))
                        ? styles.selected : ''
                    }`}
                  onClick={() => handleClothingSelect(clothing)}
                >
                  <div className={styles.clothingImageWrapper}>
                    <img 
                      src={clothing.image || "/placeholder.svg"} 
                      alt={clothing.title}
                      className={styles.clothingImage}
                    />
                    
                  </div>
                  
                  <div className={styles.clothingInfo}>
                    <h3 className={styles.clothingTitle}>{clothing.name || clothing.title}</h3>
                    <p className={styles.clothingBrand}>{clothing.brand}</p>
                    <p className={styles.clothingCategory}>{clothing.main_category || clothing.category} &gt; {clothing.sub_category || clothing.subCategory}</p>
                  </div>
                </div>
              ))}
            </div>
            )
          })()}
        </section>

        {/* 가상 피팅 실행 버튼 */}
        <div className={styles.actionSection}>
          <button 
            className={styles.startFittingBtn}
            onClick={handleVirtualFitting}
            disabled={processing || !selectedPersonImage || 
              (fittingType === "상의" && !selectedClothes.upper) ||
              (fittingType === "하의" && !selectedClothes.lower) ||
              (fittingType === "드레스" && !selectedClothes.upper && !selectedClothes.lower) ||
              (fittingType === "상의+하의" && (!selectedClothes.upper || !selectedClothes.lower))
            }
          >
            {processing ? (
              <>
                <div className={styles.spinning}>
                  <RefreshCw size={20} />
                </div>
                가상 피팅 처리 중...
              </>
            ) : (
              <>
                <Play size={20} />
                가상 피팅 시작
              </>
            )}
          </button>
          
          <button 
            className={styles.secondaryBtn}
            onClick={() => navigate("/virtual-fitting-main")}
          >
            가상 피팅 메인으로 돌아가기
          </button>
        </div>
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>사진 첨부 및 카테고리 선택</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadedImage(null)
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {uploadedImage && (
                <div className={styles.imagePreview}>
                  <img 
                    src={uploadedImage.preview} 
                    alt="업로드된 이미지"
                    className={styles.previewImage}
                  />
                  <p className={styles.imageName}>{uploadedImage.name}</p>
                </div>
              )}
              
              <div className={styles.categorySelection}>
                <h4>카테고리 선택</h4>
                <div className={styles.categoryButtons}>
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      className={`${styles.categoryBtn} ${selectedCategory === category ? styles.active : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadedImage(null)
                }}
              >
                취소
              </button>
              <button 
                className={styles.confirmBtn}
                onClick={handleUploadedImageSelect}
                disabled={!uploadedImage || !selectedCategory}
              >
                선택하기
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default FastFittingPage

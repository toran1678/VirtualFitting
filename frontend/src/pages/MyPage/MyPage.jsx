"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import { getMyLikedClothes, toggleClothingLike } from "../../api/likedClothes"
import styles from "./MyPage.module.css"
import { getProfileImageUrl, getFeedImageUrl } from "../../utils/imageUtils"
import { getMyFeeds } from "../../api/feeds"
import { getUserProfileByEmail } from "../../api/userProfiles"
import { Heart, Clock, Camera, Share2, Palette } from "lucide-react"
import { getFittingHistory, getFittingResultImageUrl } from "../../api/virtual_fitting"
import { getMyCustomClothes, getCustomClothingImageUrl, updateCustomClothing } from "../../api/customClothingAPI"

const MyPage = () => {
  const [activeTab, setActiveTab] = useState("피드")
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [likedClothes, setLikedClothes] = useState([])
  const [likedClothesLoading, setLikedClothesLoading] = useState(false)
  const [likingInProgress, setLikingInProgress] = useState(new Set())
  const navigate = useNavigate()
  const [feedsLoading, setFeedsLoading] = useState(false)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // 가상피팅 모달 상태
  const [showVirtualFittingModal, setShowVirtualFittingModal] = useState(false)
  const [selectedVirtualFitting, setSelectedVirtualFitting] = useState(null)

  // 탭과 URL 파라미터 매핑
  const tabToParamMap = {
    피드: "feed",
    "가상 피팅": "virtual-fitting",
    "커스텀 의류": "custom",
    "좋아요 의류": "like",
  }

  const paramToTabMap = {
    feed: "피드",
    "virtual-fitting": "가상 피팅",
    custom: "커스텀 의류",
    like: "좋아요 의류",
  }

  // 통계 데이터
  const [stats, setStats] = useState({
    feeds: 0,
    virtualFittings: 0,
    customClothes: 0,
    likedClothes: 0,
  })

  // 팔로우 데이터
  const [followData, setFollowData] = useState({
    following: 0,
    followers: 0,
  })

  // 이미지 모달 상태
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  
  // 커스텀 의류 이름 변경 상태
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  const [tabData, setTabData] = useState({
    피드: [],
    "가상 피팅": [],
    "커스텀 의류": [],
    "좋아요 의류": [],
  })

  // 가상 피팅 결과 로드
  const loadVirtualFittings = async () => {
    if (!isLoggedIn()) return
    try {
      const data = await getFittingHistory(1, 20)
      const fittings = Array.isArray(data?.fittings) ? data.fittings : []
      const formatted = fittings.map((f) => ({
        id: f.fitting_id,
        image: getFittingResultImageUrl(f.fitting_id),
        title: f.title || `가상 피팅 #${f.fitting_id}`,
        brand: f.title || "",
        date: new Date(f.created_at).toLocaleDateString("ko-KR"),
      }))
      setTabData((prev) => ({ ...prev, "가상 피팅": formatted }))
      setStats((prev) => ({ ...prev, virtualFittings: fittings.length }))
    } catch (error) {
      console.error("가상 피팅 결과 로드 실패:", error)
      setTabData((prev) => ({ ...prev, "가상 피팅": [] }))
      setStats((prev) => ({ ...prev, virtualFittings: 0 }))
    }
  }

  // 커스터마이징 의류 로드
  const loadCustomClothes = async () => {
    if (!isLoggedIn()) return
    try {
      const data = await getMyCustomClothes(1, 20)
      const customClothes = Array.isArray(data?.custom_clothes) ? data.custom_clothes : []
      const formatted = customClothes.map((item) => ({
        id: item.custom_clothing_id,
        image: getCustomClothingImageUrl(item.custom_image_url),
        title: item.custom_name,
        status: "완료", // 커스터마이징은 항상 완료 상태
        date: new Date(item.created_at).toLocaleDateString("ko-KR"),
      }))
      setTabData((prev) => ({ ...prev, "커스텀 의류": formatted }))
      setStats((prev) => ({ ...prev, customClothes: customClothes.length }))
    } catch (error) {
      console.error("커스터마이징 의류 로드 실패:", error)
      setTabData((prev) => ({ ...prev, "커스텀 의류": [] }))
      setStats((prev) => ({ ...prev, customClothes: 0 }))
    }
  }

  // URL 파라미터 변경 감지 및 탭 동기화
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    const refreshParam = searchParams.get("refresh")

    // 배경 커스텀 완료 후 새로고침 처리
    if (refreshParam === "background-custom") {
      loadVirtualFittings()
      // URL에서 파라미터 제거
      const newParams = new URLSearchParams(searchParams)
      newParams.delete("refresh")
      setSearchParams(newParams)
      return
    }

    if (tabParam && paramToTabMap[tabParam]) {
      const tabFromParam = paramToTabMap[tabParam]
      if (tabFromParam !== activeTab) {
        setActiveTab(tabFromParam)
      }
    } else if (!tabParam) {
      // 기본 탭 설정
      const defaultParam = tabToParamMap["피드"]
      navigate(`/mypage?tab=${defaultParam}`, { replace: true })
    }
  }, [searchParams, activeTab, navigate, paramToTabMap, setSearchParams])

  // 콘텐츠 요약 함수
  const truncateContent = (content, maxLength = 80) => {
    if (!content) return ""
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  // 피드 데이터 로드
  const loadMyFeeds = async () => {
    if (!isLoggedIn()) {
      return
    }

    setFeedsLoading(true)
    try {
      const data = await getMyFeeds({ page: 1, size: 20 })

      if (!data || !data.feeds) {
        console.warn("⚠️ 피드 데이터가 비어있음:", data)
        setTabData((prev) => ({ ...prev, 피드: [] }))
        setStats((prev) => ({ ...prev, feeds: 0 }))
        return
      }

      // 피드 데이터 포맷팅
      const formattedData = data.feeds.map((feed) => ({
        id: feed.feed_id,
        image:
          feed.images && feed.images.length > 0
            ? getFeedImageUrl(feed.images[0].image_url)
            : "/placeholder.svg?height=300&width=300",
        title: feed.title,
        content: feed.content,
        date: new Date(feed.created_at).toLocaleDateString("ko-KR"),
        likes: feed.like_count || 0,
        comments: feed.comment_count || 0,
      }))

      // 탭 데이터 업데이트
      setTabData((prev) => ({
        ...prev,
        피드: formattedData,
      }))

      // 통계 업데이트
      setStats((prev) => ({
        ...prev,
        feeds: data.total || formattedData.length,
      }))
    } catch (error) {
      console.error("피드 로드 실패:", error)
      alert(`피드를 불러오는 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setFeedsLoading(false)
    }
  }

  // 좋아요한 의류 데이터 로드
  const loadLikedClothes = async () => {
    if (!isLoggedIn()) return

    setLikedClothesLoading(true)
    try {
      const data = await getMyLikedClothes()

      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        productUrl: item.product_url,
        image: item.product_image_url,
        title: item.product_name,
        brand: item.brand_name,
        likedDate: new Date(item.liked_at).toLocaleDateString("ko-KR"),
        category: `${item.main_category} > ${item.sub_category}`,
        gender: item.gender,
      }))

      setLikedClothes(formattedData)

      setTabData((prev) => ({
        ...prev,
        "좋아요 의류": formattedData,
      }))

      setStats((prev) => ({
        ...prev,
        likedClothes: formattedData.length,
      }))
    } catch (error) {
      console.error("좋아요한 의류 로드 실패:", error)
    } finally {
      setLikedClothesLoading(false)
    }
  }

  // 사용자 프로필 정보 로드 (팔로워/팔로잉 수)
  const loadUserProfile = async (userEmail) => {
    if (!userEmail) {
      console.warn("사용자 이메일이 없어서 프로필 정보를 로드할 수 없습니다.")
      return
    }

    try {
      const profileData = await getUserProfileByEmail(userEmail)

      if (profileData) {
        setFollowData({
          following: profileData.following_count || 0,
          followers: profileData.followers_count || 0,
        })
      }
    } catch (error) {
      console.error("프로필 정보 로드 실패:", error)
      // 에러가 발생해도 기본값 유지
      setFollowData({
        following: 0,
        followers: 0,
      })
    }
  }

  // 좋아요 취소 핸들러
  const handleLikeToggle = async (e, productId) => {
    e.stopPropagation()

    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }

    if (likingInProgress.has(productId)) {
      return
    }

    try {
      setLikingInProgress((prev) => new Set([...prev, productId]))

      const result = await toggleClothingLike(productId)

      if (!result.is_liked) {
        const updatedLikedClothes = likedClothes.filter((item) => item.id !== productId)
        setLikedClothes(updatedLikedClothes)

        setTabData((prev) => ({
          ...prev,
          "좋아요 의류": updatedLikedClothes,
        }))

        setStats((prev) => ({
          ...prev,
          likedClothes: updatedLikedClothes.length,
        }))
      }
    } catch (error) {
      console.error("좋아요 처리 실패:", error)
      alert("좋아요 처리 중 오류가 발생했습니다.")
    } finally {
      setLikingInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  // 가상 피팅 핸들러
  const handleTryOn = (e, productId) => {
    e.stopPropagation()

    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }
    const item = likedClothes.find((c) => c.id === productId)
    const q = new URLSearchParams({
      clothingId: String(productId),
      clothingImage: item?.image ? encodeURIComponent(item.image) : "",
      clothingCategory: item?.category?.split('>')[0]?.trim() || "",
    }).toString()
    navigate(`/virtual-fitting?${q}`)
  }

  // 팔로잉 페이지로 이동
  const handleFollowingClick = () => {
    if (userData?.email) {
      navigate(`/follow/${userData.email}?tab=following`)
    }
  }

  // 팔로워 페이지로 이동
  const handleFollowersClick = () => {
    if (userData?.email) {
      navigate(`/follow/${userData.email}?tab=followers`)
    }
  }

  // 초기 인증 및 데이터 로드
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      const user = getCurrentUser()

      setUserData(user)
      setLoading(false)

      // 사용자 정보가 설정된 후 데이터 로드
      if (user?.email) {
        // 병렬로 데이터 로드
        await Promise.all([loadMyFeeds(), loadLikedClothes(), loadUserProfile(user.email), loadVirtualFittings(), loadCustomClothes()])
      }
    }

    checkAuth()
  }, [navigate])

  const handleProfileEdit = () => {
    navigate("/profile/edit")
  }

  const handleTabChange = (tab) => {
    const tabParam = tabToParamMap[tab]
    if (tabParam) {
      setSearchParams({ tab: tabParam })
    }
    setActiveTab(tab)
  }

  // 이미지 에러 처리 함수
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

  const handleItemClick = (item, type) => {
    switch (type) {
      case "피드":
        navigate(`/feed/${item.id}`)
        break
      case "가상 피팅":
        setSelectedVirtualFitting(item)
        setShowVirtualFittingModal(true)
        break
      case "커스텀 의류":
        // 커스터마이징 의류는 이미지 모달로 표시
        setSelectedImage(item)
        setShowImageModal(true)
        break
      case "좋아요 의류":
        if (item.productUrl) {
          window.open(item.productUrl, "_blank", "noopener,noreferrer")
        }
        break
      default:
        break
    }
  }

  // 이미지 모달 닫기
  const handleCloseImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
    setIsEditingName(false)
    setEditingName("")
  }
  
  // 커스텀 의류 이름 변경 시작
  const startEditingName = () => {
    setIsEditingName(true)
    setEditingName(selectedImage.title)
  }
  
  // 커스텀 의류 이름 변경 취소
  const cancelEditingName = () => {
    setIsEditingName(false)
    setEditingName("")
  }
  
  // 커스텀 의류 이름 변경 저장
  const saveCustomClothingName = async () => {
    if (!editingName.trim()) {
      alert("이름을 입력해주세요.")
      return
    }
    
    if (editingName.trim() === selectedImage.title) {
      setIsEditingName(false)
      return
    }
    
    try {
      setIsUpdatingName(true)
      await updateCustomClothing(selectedImage.id, editingName.trim())
      
      // 로컬 상태 업데이트
      setSelectedImage(prev => ({ ...prev, title: editingName.trim() }))
      setTabData(prev => ({
        ...prev,
        "커스텀 의류": prev["커스텀 의류"].map(item => 
          item.id === selectedImage.id 
            ? { ...item, title: editingName.trim() }
            : item
        )
      }))
      
      setIsEditingName(false)
      alert("이름이 변경되었습니다.")
    } catch (error) {
      console.error("이름 변경 실패:", error)
      alert("이름 변경에 실패했습니다.")
    } finally {
      setIsUpdatingName(false)
    }
  }

  // 모달 배경 클릭 시 닫기
  const handleModalBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isEditingName) {
        cancelEditingName()
      } else {
        handleCloseImageModal()
      }
    }
  }

  // 가상 피팅 버튼 클릭 핸들러
  const handleVirtualFittingClick = (e, customClothingItem) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    
    // 가상 피팅 페이지로 이동하면서 커스텀 의류 정보 전달
    navigate('/virtual-fitting', {
      state: {
        customClothing: {
          id: customClothingItem.id,
          name: customClothingItem.title,
          image: customClothingItem.image
        }
      }
    })
  }

  // 공유하기 버튼 클릭 핸들러
  const handleShareClick = (e, item, tabType) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    
    // 피드 작성 페이지로 이동하면서 이미지 정보 전달
    navigate('/create-feed', {
      state: {
        sharedContent: {
          type: tabType, // 'custom' 또는 'virtual-fitting'
          id: item.id,
          title: item.title,
          image: item.image,
          description: tabType === 'custom' 
            ? `내가 디자인한 ${item.title}을(를) 공유합니다!` 
            : `가상 피팅 결과를 공유합니다!`
        }
      }
    })
  }

  // 배경 커스텀 버튼 클릭 핸들러
  const handleBackgroundCustomClick = (e, item) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    
    // 배경 커스텀 페이지로 이동 (소스 페이지 정보 포함)
    navigate(`/background-custom/${item.id}?source=mypage`)
  }


  const getStatusColor = (status) => {
    switch (status) {
      case "완료":
        return styles.completed
      case "제작 완료":
        return styles.completed
      case "제작 중":
        return styles.inProgress
      case "디자인 중":
        return styles.designing
      default:
        return styles.default
    }
  }

  if (loading) {
    return (
      <div className={styles.mypage}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>로딩 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.mypage}>
      <Header />

      <main className={styles.mypageMain}>
        <div className={styles.container}>
          <div className={styles.pageContainer}>
            {/* 프로필 섹션 */}
            <section className={styles.profileSection}>
              <div className={styles.profileHeader}>
                <div className={styles.profileImageContainer}>
                  {userData?.profile_picture ? (
                    <img
                      src={getProfileImageUrl(userData.profile_picture) || "/placeholder.svg"}
                      alt="프로필"
                      className={styles.profileImage}
                      onError={(e) => handleImageError(e, "/placeholder.svg?height=120&width=120")}
                    />
                  ) : (
                    <div className={styles.profilePlaceholder}>{userData?.nickname?.charAt(0) || "U"}</div>
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <h1 className={styles.profileName}>{userData?.nickname || "사용자"}</h1>
                  <p className={styles.profileEmail}>{userData?.email || "user@example.com"}</p>

                  {/* 팔로우 정보 */}
                  <div className={styles.followInfo}>
                    <button className={styles.followItem} onClick={handleFollowersClick} title="팔로워 목록 보기">
                      <span className={styles.followCount}>{followData.followers}</span>
                      <span className={styles.followLabel}>팔로워</span>
                    </button>
                    <button className={styles.followItem} onClick={handleFollowingClick} title="팔로잉 목록 보기">
                      <span className={styles.followCount}>{followData.following}</span>
                      <span className={styles.followLabel}>팔로잉</span>
                    </button>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.actionButton}
                      onClick={() => navigate("/my-avatar")}
                      title="내 인물 이미지 관리"
                    >
                      <svg
                        className={styles.actionIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      인물 이미지
                    </button>
                    <button className={styles.actionButton} onClick={() => navigate("/my-closet")} title="내 옷장 관리">
                      <svg
                        className={styles.actionIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="2" width="18" height="20" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="9" y2="9" />
                        <line x1="15" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="2" x2="9" y2="22" />
                        <line x1="15" y1="2" x2="15" y2="22" />
                        <path d="M9 6h6" />
                        <path d="M9 18h6" />
                      </svg>
                      내 옷장
                    </button>
                    <button className={styles.actionButton} onClick={handleProfileEdit} title="프로필 수정">
                      <svg
                        className={styles.actionIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      프로필 수정
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 통계 섹션 */}
            <section className={styles.statsSection}>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.feeds}</div>
                  <div className={styles.statLabel}>피드</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.virtualFittings}</div>
                  <div className={styles.statLabel}>가상 피팅</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.customClothes}</div>
                  <div className={styles.statLabel}>커스텀 의류</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.likedClothes}</div>
                  <div className={styles.statLabel}>좋아요 의류</div>
                </div>
              </div>
            </section>

            {/* 탭 섹션 */}
            <section className={styles.tabsSection}>
              <div className={styles.tabButtons}>
                {Object.keys(tabData).map((tab) => (
                  <button
                    key={tab}
                    className={`${styles.tabButton} ${activeTab === tab ? styles.active : ""}`}
                    onClick={() => handleTabChange(tab)}
                  >
                    {tab}
                    {tab === "좋아요 의류" && likedClothesLoading && <span className={styles.loadingDot}>...</span>}
                    {tab === "피드" && feedsLoading && <span className={styles.loadingDot}>...</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* 콘텐츠 섹션 */}
            <section className={styles.contentSection}>
              <div className={styles.contentGrid}>
                {tabData[activeTab]?.map((item) => (
                  <div key={item.id} className={styles.contentItem} onClick={() => handleItemClick(item, activeTab)}>
                    <div className={styles.contentImage}>
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        onError={(e) => handleImageError(e, item.title)}
                        style={{ display: "block" }}
                      />
                      <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                        {item.title}
                      </div>

                      {/* 오버레이 정보 */}
                      <div className={styles.contentOverlay}>
                        {activeTab === "피드" && (
                          <div className={styles.overlayInfo}>
                            <span className={styles.likesCount}>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                              </svg>
                              {item.likes}
                            </span>
                            <span className={styles.date}>{item.date}</span>
                          </div>
                        )}
                        {activeTab === "가상 피팅" && (
                          <div className={styles.overlayInfo}>
                            <div className={styles.virtualFittingActions}>
                              <button 
                                className={styles.backgroundCustomButton}
                                onClick={(e) => handleBackgroundCustomClick(e, item)}
                                title="배경 커스텀하기"
                              >
                                <Palette size={16} />
                                배경 커스텀
                              </button>
                              <button 
                                className={styles.shareButton}
                                onClick={(e) => handleShareClick(e, item, 'virtual-fitting')}
                                title="피드에 공유하기"
                              >
                                <Share2 size={16} />
                                공유하기
                              </button>
                            </div>
                          </div>
                        )}
                        {activeTab === "커스텀 의류" && (
                          <div className={styles.overlayInfo}>
                            <div className={styles.customClothingActions}>
                              <button 
                                className={styles.virtualFittingButton}
                                onClick={(e) => handleVirtualFittingClick(e, item)}
                                title="가상 피팅하기"
                              >
                                <Camera size={16} />
                                가상 피팅
                              </button>
                              <button 
                                className={styles.shareButton}
                                onClick={(e) => handleShareClick(e, item, 'custom')}
                                title="피드에 공유하기"
                              >
                                <Share2 size={16} />
                                공유하기
                              </button>
                            </div>
                          </div>
                        )}
                        {activeTab === "좋아요 의류" && (
                          <div className={styles.overlayButtons}>
                            <button 
                              className={styles.virtualFittingButton} 
                              onClick={(e) => handleTryOn(e, item.id)}
                              title="가상 피팅하기"
                            >
                              <Camera size={16} />
                              가상 피팅
                            </button>
                            <button
                              className={`${styles.heartBtn} ${styles.liked}`}
                              onClick={(e) => handleLikeToggle(e, item.id)}
                              disabled={likingInProgress.has(item.id)}
                              title="좋아요 취소"
                            >
                              <span className={styles.heartIcon}>
                                {likingInProgress.has(item.id) ? (
                                  <Clock size={16} />
                                ) : (
                                  <Heart size={16} fill="currentColor" />
                                )}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.contentInfo}>
                      <h3 className={styles.contentTitle}>{item.title}</h3>

                      {/* 피드의 경우 콘텐츠 요약 추가 */}
                      {activeTab === "피드" && item.content && (
                        <p className={styles.contentSummary}>{truncateContent(item.content)}</p>
                      )}

                      {/* 메타 정보 */}
                      {activeTab === "피드" && (
                        <div className={styles.contentMeta}>
                          <span className={styles.comments}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            {item.comments}
                          </span>
                          <span className={styles.date}>{item.date}</span>
                        </div>
                      )}
                      {activeTab === "가상 피팅" && (
                        <div className={styles.contentMeta}>
                          <span className={styles.brand}>{item.brand}</span>
                          <span className={styles.date}>{item.date}</span>
                        </div>
                      )}
                      {activeTab === "커스텀 의류" && (
                        <div className={styles.contentMeta}>
                          <span className={`${styles.status} ${getStatusColor(item.status)}`}>{item.status}</span>
                          <span className={styles.date}>{item.date}</span>
                        </div>
                      )}
                      {activeTab === "좋아요 의류" && (
                        <div className={styles.contentMeta}>
                          <span className={styles.brand}>{item.brand}</span>
                          <span className={styles.likedDate}>좋아요: {item.likedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {tabData[activeTab]?.length === 0 && (
                <div className={styles.emptyContent}>
                  <div className={styles.emptyIcon}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <h3>아직 {activeTab}가 없습니다</h3>
                  <p>새로운 {activeTab}를 추가해보세요!</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />

      {/* 이미지 모달 */}
      {showImageModal && selectedImage && (
        <div className={styles.modalOverlay} onClick={handleModalBackgroundClick}>
          <div className={styles.customClothingModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>커스텀 의류 상세 정보</h2>
              <button 
                className={styles.modalClose}
                onClick={() => {
                  if (isEditingName) {
                    cancelEditingName()
                  } else {
                    handleCloseImageModal()
                  }
                }}
                aria-label="닫기"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.customClothingImageContainer}>
                <img 
                  src={selectedImage.image || "/placeholder.svg"} 
                  alt={selectedImage.title}
                  className={styles.customClothingModalImage}
                  onError={(e) => handleImageError(e, selectedImage.title)}
                />
              </div>
              
              <div className={styles.customClothingInfo}>
                <div className={styles.customClothingTitleContainer}>
                  {isEditingName ? (
                    <div className={styles.nameEditContainer}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={styles.nameEditInput}
                        placeholder="커스텀 의류 이름"
                        maxLength={50}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveCustomClothingName()
                          } else if (e.key === 'Escape') {
                            cancelEditingName()
                          }
                        }}
                      />
                      <div className={styles.nameEditButtons}>
                        <button
                          onClick={saveCustomClothingName}
                          disabled={isUpdatingName}
                          className={styles.nameEditSaveButton}
                        >
                          {isUpdatingName ? "저장 중..." : "저장"}
                        </button>
                        <button
                          onClick={cancelEditingName}
                          disabled={isUpdatingName}
                          className={styles.nameEditCancelButton}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.nameDisplayContainer}>
                      <h3 className={styles.customClothingTitle}>{selectedImage.title}</h3>
                      <button
                        onClick={startEditingName}
                        className={styles.nameEditButton}
                        title="이름 변경"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.customClothingMeta}>
                  <span className={styles.customClothingStatus}>{selectedImage.status}</span>
                  <span className={styles.customClothingDate}>
                    <Clock size={16} />
                    {selectedImage.date}
                  </span>
                </div>
                
                <div className={styles.customClothingActions}>
                  <button 
                    className={styles.virtualFittingButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVirtualFittingClick(e, selectedImage)
                    }}
                  >
                    <Camera size={16} />
                    가상 피팅
                  </button>
                  
                  <button 
                    className={styles.shareButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareClick(e, selectedImage, 'custom')
                    }}
                  >
                    <Share2 size={16} />
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가상피팅 모달 */}
      {showVirtualFittingModal && selectedVirtualFitting && (
        <div className={styles.modalOverlay} onClick={() => setShowVirtualFittingModal(false)}>
          <div className={styles.virtualFittingModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>가상피팅 상세 정보</h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowVirtualFittingModal(false)}
                aria-label="닫기"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.virtualFittingImageContainer}>
                <img 
                  src={getFittingResultImageUrl(selectedVirtualFitting.id)} 
                  alt={selectedVirtualFitting.title}
                  className={styles.virtualFittingModalImage}
                />
              </div>
              
              <div className={styles.virtualFittingInfo}>
                <h3 className={styles.virtualFittingTitle}>{selectedVirtualFitting.title}</h3>
                <div className={styles.virtualFittingMeta}>
                  <span className={styles.virtualFittingDate}>
                    <Clock size={16} />
                    {selectedVirtualFitting.date}
                  </span>
                </div>
                
                <div className={styles.virtualFittingActions}>
                  <button 
                    className={styles.backgroundCustomButton}
                    onClick={() => {
                      setShowVirtualFittingModal(false)
                      navigate(`/background-custom/${selectedVirtualFitting.id}?source=mypage`)
                    }}
                  >
                    <Palette size={16} />
                    배경 커스텀
                  </button>
                  
                  <button 
                    className={styles.shareButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareClick(e, selectedVirtualFitting, 'virtual-fitting')
                    }}
                  >
                    <Share2 size={16} />
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyPage

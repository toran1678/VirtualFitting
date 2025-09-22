"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { getUserProfileByEmail, getUserFeeds, getUserLikedClothes, getUserVirtualFittings, getUserCustomClothes } from "../../api/userProfiles"
import { toggleUserFollowEnhanced } from "../../api/followSystem"
import styles from "./UserProfilePage.module.css"
import { getProfileImageUrl, getFeedImageUrl, getImageUrl } from "../../utils/imageUtils"
import FollowButton from "../../components/FollowButton/FollowButton"

const UserProfilePage = () => {
  const { email } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("피드")
  const [tabData, setTabData] = useState({
    피드: [],
    "가상 피팅": [],
    "커스텀 의류": [],
    "좋아요 의류": [],
  })
  const [stats, setStats] = useState({
    feeds: 0,
    virtualFittings: 0,
    customClothes: 0,
    likedClothes: 0,
  })
  // 개별 탭 로딩 상태들
  const [tabLoadingStates, setTabLoadingStates] = useState({
    피드: false,
    "가상 피팅": false,
    "커스텀 의류": false,
    "좋아요 의류": false,
  })
  const [followLoading, setFollowLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  // 탭과 URL 파라미터 매핑
  const tabToParamMap = useMemo(() => ({
    피드: "feed",
    "가상 피팅": "virtual-fitting",
    "커스텀 의류": "custom",
    "좋아요 의류": "like",
  }), [])

  const paramToTabMap = useMemo(() => ({
    feed: "피드",
    "virtual-fitting": "가상 피팅",
    custom: "커스텀 의류",
    like: "좋아요 의류",
  }), [])

  // 콘텐츠 요약 함수
  const truncateContent = (content, maxLength = 80) => {
    if (!content) return ""
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  // 탭 로딩 상태 업데이트 헬퍼
  const setTabLoading = (tab, isLoading) => {
    setTabLoadingStates((prev) => ({
      ...prev,
      [tab]: isLoading,
    }))
  }

  // URL 파라미터 변경 감지 및 탭 동기화
  useEffect(() => {
    const tabParam = searchParams.get("tab")

    if (tabParam && paramToTabMap[tabParam]) {
      const tabFromParam = paramToTabMap[tabParam]
      if (tabFromParam !== activeTab) {
        setActiveTab(tabFromParam)
      }
    } else if (!tabParam) {
      const defaultParam = tabToParamMap["피드"]
      setSearchParams({ tab: defaultParam })
    }
  }, [searchParams, activeTab, setSearchParams, paramToTabMap, tabToParamMap])

  // 초기 데이터 로드 - 의존성 배열 단순화
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!email) {
        navigate("/not-found")
        return
      }

      setLoading(true)
      setApiError(null)

      try {
        // 본인 이메일인지 확인 후 MyPage로 리다이렉트
        if (currentUser && currentUser.email === email) {
          const currentTab = searchParams.get("tab")
          const redirectUrl = currentTab ? `/mypage?tab=${currentTab}` : "/mypage"
          navigate(redirectUrl, { replace: true })
          return
        }

        console.log("프로필 데이터 로드 시작:", email)

        // 프로필 정보 가져오기
        const profileData = await getUserProfileByEmail(email)
        console.log("프로필 데이터 로드 완료:", profileData)

        setUserData(profileData)

        // 프로필 로딩 즉시 완료
        setLoading(false)
      } catch (error) {
        console.error("프로필 로드 실패:", error)
        setLoading(false)

        let errorMessage = "알 수 없는 오류가 발생했습니다."

        if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorMessage = "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        } else if (error.response) {
          switch (error.response.status) {
            case 404:
              navigate("/not-found")
              return
            case 403:
              errorMessage = "접근 권한이 없습니다."
              break
            case 500:
              errorMessage = "서버 내부 오류가 발생했습니다."
              break
            default:
              errorMessage = `서버 오류 (${error.response.status}): ${error.response.data?.detail || "알 수 없는 오류"}`
          }
        } else if (error.message?.includes("Network Error")) {
          errorMessage = "네트워크 연결을 확인해주세요. 백엔드 서버가 실행 중인지 확인하세요."
        }

        setApiError(errorMessage)

        // 기본 사용자 데이터 설정
        setUserData({
          nickname: email.split("@")[0] || "사용자",
          email: email,
          profile_picture: null,
          followers_count: 0,
          following_count: 0,
          is_following: false,
          is_private: false,
        })
      }
    }
    loadUserProfile()
  }, [email, currentUser, navigate]) // searchParams 제거 - 탭 변경 시 프로필 재로드 방지

  // 사용자 데이터 로드 후 초기 통계 로드
  useEffect(() => {
    const loadInitialStats = async () => {
      if (!email || !userData) {
        console.log("❌ 초기 통계 로드 조건 불만족:", { email, userData: !!userData })
        return
      }

      console.log("🚀 초기 통계 로드 시작:", { email, userDataEmail: userData.email })
      
      try {
        // 모든 통계를 병렬로 가져오기
        const [feedsData, virtualFittingsData, customClothesData, likedClothesData] = await Promise.allSettled([
          getUserFeeds(email, { page: 1, size: 1 }), // 개수만 필요하므로 1개만 가져옴
          getUserVirtualFittings(email, { page: 1, per_page: 1 }),
          getUserCustomClothes(email, { skip: 0, limit: 1000 }), // 충분히 큰 값으로 설정
          getUserLikedClothes(email, { skip: 0, limit: 1000 }) // 충분히 큰 값으로 설정
        ])

        console.log("🔍 API 응답 상태:", {
          feedsData: feedsData.status,
          virtualFittingsData: virtualFittingsData.status,
          customClothesData: customClothesData.status,
          likedClothesData: likedClothesData.status
        })

        console.log("🔍 커스텀 의류 데이터:", customClothesData)
        console.log("🔍 좋아요 의류 데이터:", likedClothesData)

        // 통계 업데이트
        setStats({
          feeds: feedsData.status === 'fulfilled' ? (feedsData.value.total || 0) : 0,
          virtualFittings: virtualFittingsData.status === 'fulfilled' ? (virtualFittingsData.value.total || 0) : 0,
          customClothes: customClothesData.status === 'fulfilled' ? customClothesData.value.length : 0,
          likedClothes: likedClothesData.status === 'fulfilled' ? likedClothesData.value.length : 0,
        })

        console.log("✅ 초기 통계 로드 완료:", {
          feeds: feedsData.status === 'fulfilled' ? (feedsData.value.total || 0) : 0,
          virtualFittings: virtualFittingsData.status === 'fulfilled' ? (virtualFittingsData.value.total || 0) : 0,
          customClothes: customClothesData.status === 'fulfilled' ? customClothesData.value.length : 0,
          likedClothes: likedClothesData.status === 'fulfilled' ? likedClothesData.value.length : 0,
        })

      } catch (error) {
        console.error("❌ 초기 통계 로드 실패:", error)
      }
    }

    if (userData && userData.email) {
      loadInitialStats()
    }
  }, [userData?.email, email, userData]) // userData도 의존성에 포함

  // 탭 데이터 로드를 위한 별도 useEffect
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    const currentActiveTab = paramToTabMap[tabParam] || "피드"

    // 공개 계정이 아니거나 팔로우 중인 경우에만 데이터 로드
    if (!userData || !userData.is_private || userData.is_following) {
      // 탭 데이터 로드 함수 - useEffect 내부에서 정의하여 의존성 문제 해결
      const loadTabData = (tab) => {
        if (!email || !userData) {
          console.log("❌ loadTabData: email 또는 userData가 없음", { email, userData })
          return
        }

        // 이미 데이터가 있고 로딩 중이 아니면 로드하지 않음
        if (tabData[tab] && tabData[tab].length > 0 && !tabLoadingStates[tab]) {
          console.log(`✅ ${tab} 탭 데이터 이미 존재, 로드 스킵`, { 
            dataLength: tabData[tab].length,
            loading: tabLoadingStates[tab]
          })
          return
        }

        // 로딩 중이면 로드하지 않음
        if (tabLoadingStates[tab]) {
          console.log(`⏳ ${tab} 탭 로딩 중, 로드 스킵`)
          return
        }

        console.log(`🚀 ${tab} 탭 데이터 로드 시작`, { email, userData: userData.email })

        switch (tab) {
          case "피드":
            loadUserFeeds()
            break
          case "가상 피팅":
            loadUserVirtualFittings()
            break
          case "커스텀 의류":
            loadUserCustomClothes()
            break
          case "좋아요 의류":
            loadUserLikedClothes()
            break
          default:
            break
        }
      }

      loadTabData(currentActiveTab)
    }
  }, [userData, searchParams, paramToTabMap, email, tabData, tabLoadingStates])

  // 사용자 피드 로드
  const loadUserFeeds = async () => {
    setTabLoading("피드", true)
    try {
      console.log("피드 API 호출 시작:", email)
      const data = await getUserFeeds(email, { page: 1, size: 20 })
      console.log("피드 API 응답:", data)

      if (!data || !data.feeds) {
        console.log("피드 데이터가 없음")
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

      console.log("포맷된 피드 데이터:", formattedData)

      setTabData((prev) => ({ ...prev, 피드: formattedData }))
      setStats((prev) => ({ ...prev, feeds: data.total || formattedData.length }))
    } catch (error) {
      console.error("피드 로드 실패:", error)

      if (error.response?.status === 403) {
        console.log("비공개 계정 - 피드 접근 제한")
      }
      setTabData((prev) => ({ ...prev, 피드: [] }))
      setStats((prev) => ({ ...prev, feeds: 0 }))
    } finally {
      setTabLoading("피드", false)
    }
  }

  // 사용자 가상 피팅 로드
  const loadUserVirtualFittings = async () => {
    setTabLoading("가상 피팅", true)
    try {
      console.log("🔍 가상 피팅 API 호출 시작:", email)
      console.log("🔍 API 함수 확인:", getUserVirtualFittings)
      const data = await getUserVirtualFittings(email, { page: 1, per_page: 20 })
      console.log("✅ 가상 피팅 API 응답:", data)
      console.log("🔍 응답 데이터 타입:", typeof data, "fittings 존재:", !!data.fittings)
      console.log("🔍 fittings 배열 길이:", data.fittings?.length || 0)

      const formattedData = data.fittings?.map((fitting) => {
        const imageUrl = getImageUrl(fitting.fitting_image_url)
        console.log("🖼️ 가상 피팅 이미지 URL:", {
          original: fitting.fitting_image_url,
          processed: imageUrl
        })
        return {
          id: fitting.fitting_id,
          image: imageUrl,
          title: fitting.title || "가상 피팅",
          date: new Date(fitting.created_at).toLocaleDateString("ko-KR"),
          sourceModelImage: getImageUrl(fitting.source_model_image_url),
          sourceClothImage: getImageUrl(fitting.source_cloth_image_url),
        }
      }) || []

      setTabData((prev) => ({ ...prev, "가상 피팅": formattedData }))
      setStats((prev) => ({ ...prev, virtualFittings: data.total || formattedData.length }))
    } catch (error) {
      console.error("가상 피팅 로드 실패:", error)

      if (error.response?.status === 403) {
        console.log("비공개 계정 - 가상 피팅 접근 제한")
      }
      setTabData((prev) => ({ ...prev, "가상 피팅": [] }))
      setStats((prev) => ({ ...prev, virtualFittings: 0 }))
    } finally {
      setTabLoading("가상 피팅", false)
    }
  }

  // 사용자 커스텀 의류 로드
  const loadUserCustomClothes = async () => {
    setTabLoading("커스텀 의류", true)
    try {
      console.log("🔍 커스텀 의류 API 호출 시작:", email)
      console.log("🔍 API 함수 확인:", getUserCustomClothes)
      const data = await getUserCustomClothes(email, { skip: 0, limit: 100 })
      console.log("✅ 커스텀 의류 API 응답:", data)
      console.log("🔍 응답 데이터 타입:", typeof data, "배열 길이:", Array.isArray(data) ? data.length : "배열 아님")
      console.log("🔍 첫 번째 아이템:", data[0])

      const formattedData = data.map((item) => {
        const imageUrl = getImageUrl(item.image_url)
        console.log("🖼️ 커스텀 의류 이미지 URL:", {
          original: item.image_url,
          processed: imageUrl
        })
        return {
          id: item.id,
          image: imageUrl,
          title: item.name,
          brand: item.brand || "커스텀",
          category: item.category,
          color: item.color,
          season: item.season,
          style: item.style,
          date: new Date(item.created_at).toLocaleDateString("ko-KR"),
        }
      })

      setTabData((prev) => ({ ...prev, "커스텀 의류": formattedData }))
      setStats((prev) => ({ ...prev, customClothes: formattedData.length }))
    } catch (error) {
      console.error("커스텀 의류 로드 실패:", error)

      if (error.response?.status === 403) {
        console.log("비공개 계정 - 커스텀 의류 접근 제한")
      }
      setTabData((prev) => ({ ...prev, "커스텀 의류": [] }))
      setStats((prev) => ({ ...prev, customClothes: 0 }))
    } finally {
      setTabLoading("커스텀 의류", false)
    }
  }

  // 사용자 좋아요 의류 로드
  const loadUserLikedClothes = async () => {
    setTabLoading("좋아요 의류", true)
    try {
      console.log("좋아요 의류 API 호출 시작:", email)
      const data = await getUserLikedClothes(email, { skip: 0, limit: 100 })
      console.log("좋아요 의류 API 응답:", data)

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

      setTabData((prev) => ({ ...prev, "좋아요 의류": formattedData }))
      setStats((prev) => ({ ...prev, likedClothes: formattedData.length }))
    } catch (error) {
      console.error("좋아요 의류 로드 실패:", error)

      if (error.response?.status === 403) {
        console.log("비공개 계정 - 좋아요 의류 접근 제한")
      }
      setTabData((prev) => ({ ...prev, "좋아요 의류": [] }))
      setStats((prev) => ({ ...prev, likedClothes: 0 }))
    } finally {
      setTabLoading("좋아요 의류", false)
    }
  }


  // 팔로우 토글 핸들러
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }

    if (followLoading) return

    setFollowLoading(true)
    try {
      const result = await toggleUserFollowEnhanced(email)

      setUserData((prev) => ({
        ...prev,
        is_following: result.is_following,
        followers_count: result.followers_count,
        has_pending_request: result.has_pending_request || false,
      }))

      // 팔로우 요청을 보낸 경우 메시지 표시
      if (result.message && result.message.includes("요청")) {
        alert(result.message)
      }
    } catch (error) {
      console.error("팔로우 토글 실패:", error)

      if (error.response?.status === 400 && error.response?.data?.detail?.includes("이미 팔로우 요청")) {
        alert("이미 팔로우 요청을 보냈습니다.")
      } else {
        alert("팔로우 처리 중 오류가 발생했습니다.")
      }
    } finally {
      setFollowLoading(false)
    }
  }


  // 가상 피팅 핸들러
  const handleTryOn = (e, productId) => {
    e.stopPropagation()

    if (!isAuthenticated) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }
    
    // 현재 활성 탭에 따라 적절한 데이터 찾기
    let item = null
    if (activeTab === "좋아요 의류") {
      item = tabData["좋아요 의류"]?.find((c) => c.id === productId)
    } else if (activeTab === "커스텀 의류") {
      item = tabData["커스텀 의류"]?.find((c) => c.id === productId)
    }
    
    const q = new URLSearchParams({
      clothingId: String(productId),
      clothingImage: item?.image ? encodeURIComponent(item.image) : "",
      clothingCategory: item?.category?.split('>')[0]?.trim() || "",
    }).toString()
    navigate(`/virtual-fitting?${q}`)
  }

  // 탭 변경 핸들러 - 단순화
  const handleTabChange = (tab) => {
    console.log(`🖱️ 탭 클릭: ${tab}`, { 
      userData: !!userData, 
      tabData: tabData[tab], 
      loading: tabLoadingStates[tab] 
    })
    
    const tabParam = tabToParamMap[tab]
    if (tabParam) {
      setSearchParams({ tab: tabParam })
    }
    setActiveTab(tab)

    // 탭 데이터가 없고 로딩 중이 아니면 로드
    if (userData && (!tabData[tab] || tabData[tab].length === 0) && !tabLoadingStates[tab]) {
      console.log(`📡 ${tab} 탭 데이터 로드 필요`)
      
      switch (tab) {
        case "피드":
          loadUserFeeds()
          break
        case "가상 피팅":
          loadUserVirtualFittings()
          break
        case "커스텀 의류":
          loadUserCustomClothes()
          break
        case "좋아요 의류":
          loadUserLikedClothes()
          break
        default:
          break
      }
    } else {
      console.log(`⏭️ ${tab} 탭 데이터 로드 건너뜀`, {
        hasUserData: !!userData,
        hasTabData: !!tabData[tab],
        tabDataLength: tabData[tab]?.length,
        isLoading: tabLoadingStates[tab]
      })
    }
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

  // 아이템 클릭 핸들러
  const handleItemClick = (item, type) => {
    switch (type) {
      case "피드":
        navigate(`/feed/${item.id}`)
        break
      case "가상 피팅":
        navigate(`/virtual-fitting/${item.id}`)
        break
      case "커스텀 의류":
        navigate(`/custom/${item.id}`)
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

  // 로딩 상태
  if (loading) {
    return (
      <div className={styles.userProfile}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>프로필 정보를 불러오는 중입니다...</p>
          <p className={styles.loadingSubtext}>잠시만 기다려주세요</p>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러 상태
  if (apiError) {
    return (
      <div className={styles.userProfile}>
        <Header />
        <div className={styles.errorContainer}>
          <h2>프로필을 불러올 수 없습니다</h2>
          <p>{apiError}</p>
          <div className={styles.errorActions}>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              다시 시도
            </button>
            <button onClick={() => navigate("/")} className={styles.homeButton}>
              홈으로 돌아가기
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // 사용자 데이터가 없는 경우
  if (!userData) {
    return (
      <div className={styles.userProfile}>
        <Header />
        <div className={styles.errorContainer}>
          <h2>사용자를 찾을 수 없습니다</h2>
          <button onClick={() => navigate("/")} className={styles.homeButton}>
            홈으로 돌아가기
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // 비공개 계정이고 팔로우하지 않은 경우
  const isPrivateAndNotFollowing = userData.is_private && !userData.is_following

  const handleFollowChange = (changeData) => {
    setUserData((prev) => ({
      ...prev,
      is_following: changeData.isFollowing,
      has_pending_request: changeData.hasPendingRequest,
      followers_count: changeData.followersCount || prev.followers_count,
    }))

    // 메시지가 있으면 표시
    if (changeData.message) {
      console.log("팔로우 상태 변경:", changeData.message)
    }
  }

  // 팔로우 버튼 텍스트 결정
  const getFollowButtonText = () => {
    if (followLoading) return "처리중..."
    if (userData?.is_following) return "팔로잉"
    if (userData?.has_pending_request) return "요청됨"
    return "팔로우"
  }

  return (
    <div className={styles.userProfile}>
      <Header />

      <main className={styles.userProfileMain}>
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
                  <p className={styles.profileEmail}>{userData?.email || email}</p>

                  {/* 팔로우 정보 */}
                  <div className={styles.followInfo}>
                    <button
                      className={styles.followItem}
                      onClick={() => navigate(`/follow/${email}`)}
                      title="팔로잉 목록 보기"
                    >
                      <span className={styles.followCount}>{userData?.followers_count || 0}</span>
                      <span className={styles.followLabel}>팔로워</span>
                    </button>
                    <button
                      className={styles.followItem}
                      onClick={() => navigate(`/follow/${email}`)}
                      title="팔로워 목록 보기"
                    >
                      <span className={styles.followCount}>{userData?.following_count || 0}</span>
                      <span className={styles.followLabel}>팔로잉</span>
                    </button>
                  </div>

                  {/* 팔로우 버튼 */}
                  <div className={styles.actionButtons}>
                    <FollowButton
                      userEmail={userData.email}
                      initialFollowState={userData.is_following}
                      initialHasPendingRequest={userData.has_pending_request || false}
                      onFollowChange={handleFollowChange}
                      size="large"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 비공개 계정이 아니거나 팔로우 중인 경우에만 콘텐츠 표시 */}
            {!isPrivateAndNotFollowing ? (
              <>
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
                        {tabLoadingStates[tab] && (!tabData[tab] || tabData[tab].length === 0) && <span className={styles.loadingDot}>...</span>}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 콘텐츠 섹션 */}
                <section className={styles.contentSection}>
                  <div className={styles.contentGrid}>
                    {tabData[activeTab]?.map((item) => (
                      <div
                        key={item.id}
                        className={styles.contentItem}
                        onClick={() => handleItemClick(item, activeTab)}
                      >
                        <div className={styles.contentImage}>
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.title}
                            onLoad={() => console.log("✅ 이미지 로드 성공:", item.image)}
                            onError={(e) => {
                              console.log("❌ 이미지 로드 실패:", item.image)
                              handleImageError(e, item.title)
                            }}
                            style={{ display: "block" }}
                          />
                          <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                            {item.title}
                          </div>

                          {/* 오버레이 정보 */}
                          <div className={styles.contentOverlay}>
                            {activeTab === "피드" && (
                              <div className={styles.overlayInfo}>
                                <span className={styles.likesCount}>♥ {item.likes}</span>
                                <span className={styles.date}>{item.date}</span>
                              </div>
                            )}
                            {activeTab === "좋아요 의류" && (
                              <div className={styles.overlayButtons}>
                                <button className={styles.virtualFittingBtn} onClick={(e) => handleTryOn(e, item.id)}>
                                  가상 피팅
                                </button>
                              </div>
                            )}
                            {activeTab === "커스텀 의류" && (
                              <div className={styles.overlayButtons}>
                                <button className={styles.virtualFittingBtn} onClick={(e) => handleTryOn(e, item.id)}>
                                  가상 피팅
                                </button>
                              </div>
                            )}
                            {activeTab === "가상 피팅" && (
                              <div className={styles.overlayButtons}>
                                <button className={styles.virtualFittingBtn} onClick={(e) => handleTryOn(e, item.id)}>
                                  가상 피팅
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
                            </div>
                          )}
                          {activeTab === "좋아요 의류" && (
                            <div className={styles.contentMeta}>
                              <span className={styles.brand}>{item.brand}</span>
                              <span className={styles.likedDate}>좋아요: {item.likedDate}</span>
                            </div>
                          )}
                          {activeTab === "가상 피팅" && (
                            <div className={styles.contentMeta}>
                              <span className={styles.date}>{item.date}</span>
                            </div>
                          )}
                          {activeTab === "커스텀 의류" && (
                            <div className={styles.contentMeta}>
                              <span className={styles.brand}>{item.brand}</span>
                              <span className={styles.date}>{item.date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {tabData[activeTab]?.length === 0 && !tabLoadingStates[activeTab] && (
                    <div className={styles.emptyContent}>
                      <div className={styles.emptyIcon}>
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <h3>아직 {activeTab}가 없습니다</h3>
                      <p>이 사용자의 {activeTab}를 기다려보세요!</p>
                    </div>
                  )}

                  {tabLoadingStates[activeTab] && (
                    <div className={styles.tabLoadingContainer}>
                      <div className={styles.loadingSpinner}></div>
                      <p>{activeTab} 데이터를 불러오는 중...</p>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className={styles.privateAccount}>
                <div className={styles.privateIcon}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>비공개 계정입니다</h3>
                <p>이 사용자의 콘텐츠를 보려면 팔로우 요청을 보내세요.</p>
                <button
                  className={`${styles.followButton} ${userData?.is_following ? styles.following : ""} ${
                    userData?.has_pending_request ? styles.pending : ""
                  }`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  title={userData?.is_following ? "언팔로우" : userData?.has_pending_request ? "요청 취소" : "팔로우"}
                >
                  {getFollowButtonText()}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default UserProfilePage


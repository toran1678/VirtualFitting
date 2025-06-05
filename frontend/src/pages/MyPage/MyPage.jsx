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
  const [searchParams] = useSearchParams()

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
    virtualFittings: 18,
    customClothes: 12,
    likedClothes: 0,
  })

  // 팔로우 데이터
  const [followData, setFollowData] = useState({
    following: 0,
    followers: 0,
  })

  const [tabData, setTabData] = useState({
    피드: [],
    "가상 피팅": [
      {
        id: 1,
        image: "/placeholder.svg?height=300&width=300",
        title: "나이키 후드티",
        brand: "나이키",
        date: "2024-01-15",
      },
      {
        id: 2,
        image: "/placeholder.svg?height=300&width=300",
        title: "유니클로 청바지",
        brand: "유니클로",
        date: "2024-01-14",
      },
      {
        id: 3,
        image: "/placeholder.svg?height=300&width=300",
        title: "자라 코트",
        brand: "자라",
        date: "2024-01-13",
      },
      {
        id: 4,
        image: "/placeholder.svg?height=300&width=300",
        title: "아디다스 운동화",
        brand: "아디다스",
        date: "2024-01-12",
      },
      {
        id: 5,
        image: "/placeholder.svg?height=300&width=300",
        title: "H&M 셔츠",
        brand: "H&M",
        date: "2024-01-11",
      },
      {
        id: 6,
        image: "/placeholder.svg?height=300&width=300",
        title: "무신사 맨투맨",
        brand: "무신사",
        date: "2024-01-10",
      },
    ],
    "커스텀 의류": [
      {
        id: 1,
        image: "/placeholder.svg?height=300&width=300",
        title: "커스텀 후드티",
        status: "제작 완료",
        date: "2024-01-15",
      },
      {
        id: 2,
        image: "/placeholder.svg?height=300&width=300",
        title: "개인 맞춤 셔츠",
        status: "제작 중",
        date: "2024-01-14",
      },
      {
        id: 3,
        image: "/placeholder.svg?height=300&width=300",
        title: "커스텀 청바지",
        status: "제작 완료",
        date: "2024-01-13",
      },
      {
        id: 4,
        image: "/placeholder.svg?height=300&width=300",
        title: "맞춤 코트",
        status: "디자인 중",
        date: "2024-01-12",
      },
      {
        id: 5,
        image: "/placeholder.svg?height=300&width=300",
        title: "개인 티셔츠",
        status: "제작 완료",
        date: "2024-01-11",
      },
      {
        id: 6,
        image: "/placeholder.svg?height=300&width=300",
        title: "커스텀 원피스",
        status: "제작 중",
        date: "2024-01-10",
      },
    ],
    "좋아요 의류": [],
  })

  // URL 파라미터 변경 감지 및 탭 동기화
  useEffect(() => {
    const tabParam = searchParams.get("tab")

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
  }, [searchParams, activeTab, navigate, paramToTabMap])

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
      console.log("프로필 정보 로드 시작:", userEmail)
      const profileData = await getUserProfileByEmail(userEmail)

      if (profileData) {
        setFollowData({
          following: profileData.following_count || 0,
          followers: profileData.followers_count || 0,
        })

        console.log("프로필 정보 로드 완료:", {
          email: userEmail,
          following: profileData.following_count,
          followers: profileData.followers_count,
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

    navigate(`/virtual-fitting/try/${productId}`)
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
      console.log("현재 사용자 정보:", user)

      setUserData(user)
      setLoading(false)

      // 사용자 정보가 설정된 후 데이터 로드
      if (user?.email) {
        // 병렬로 데이터 로드
        await Promise.all([loadMyFeeds(), loadLikedClothes(), loadUserProfile(user.email)])
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
      const newUrl = `/mypage?tab=${tabParam}`
      window.location.href = newUrl
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
        navigate(`/virtual-fitting/${item.id}`)
        break
      case "커스텀 의류":
        navigate(`/custom/${item.id}`)
        break
      case "좋아요 의류":
        if (item.productUrl) {
          window.open(item.productUrl, "_blank", "noopener,noreferrer")
        } else {
          console.log("상품 URL이 없습니다:", item)
        }
        break
      default:
        break
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
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
                    <button className={styles.followItem} onClick={handleFollowingClick} title="팔로잉 목록 보기">
                      <span className={styles.followCount}>{followData.following}</span>
                      <span className={styles.followLabel}>팔로잉</span>
                    </button>
                    <button className={styles.followItem} onClick={handleFollowersClick} title="팔로워 목록 보기">
                      <span className={styles.followCount}>{followData.followers}</span>
                      <span className={styles.followLabel}>팔로워</span>
                    </button>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.actionButton}
                      onClick={() => navigate("/my-avatar")}
                      title="내 인물 이미지 관리"
                    >
                      인물 이미지
                    </button>
                    <button className={styles.actionButton} onClick={() => navigate("/my-closet")} title="내 옷장 관리">
                      내 옷장
                    </button>
                    <button className={styles.actionButton} onClick={handleProfileEdit} title="프로필 수정">
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
                            <span className={styles.likesCount}>♥ {item.likes}</span>
                            <span className={styles.date}>{item.date}</span>
                          </div>
                        )}
                        {activeTab === "가상 피팅" && (
                          <div className={styles.overlayInfo}>
                            <span className={styles.brand}>{item.brand}</span>
                            <span className={styles.date}>{item.date}</span>
                          </div>
                        )}
                        {activeTab === "커스텀 의류" && (
                          <div className={styles.overlayInfo}>
                            <span className={`${styles.status} ${getStatusColor(item.status)}`}>{item.status}</span>
                            <span className={styles.date}>{item.date}</span>
                          </div>
                        )}
                        {activeTab === "좋아요 의류" && (
                          <div className={styles.overlayButtons}>
                            <button className={styles.virtualFittingBtn} onClick={(e) => handleTryOn(e, item.id)}>
                              가상 피팅
                            </button>
                            <button
                              className={`${styles.heartBtn} ${styles.liked}`}
                              onClick={(e) => handleLikeToggle(e, item.id)}
                              disabled={likingInProgress.has(item.id)}
                              title="좋아요 취소"
                            >
                              <span className={styles.heartIcon}>{likingInProgress.has(item.id) ? "⏳" : "❤️"}</span>
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
                          <span className={styles.comments}>💬 {item.comments}</span>
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
                  <div className={styles.emptyIcon}>📭</div>
                  <h3>아직 {activeTab}가 없습니다</h3>
                  <p>새로운 {activeTab}를 추가해보세요!</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default MyPage

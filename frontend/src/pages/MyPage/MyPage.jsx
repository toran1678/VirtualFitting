"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import Footer from "../../components/Footer"
import ImagePlaceholder from "../../components/ImagePlaceholder"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import { getMyLikedClothes, toggleClothingLike } from "../../api/likedClothes"
import styles from "./MyPage.module.css"
import { getProfileImageUrl, handleImageError } from "../../utils/imageUtils"

const MyPage = () => {
  const [activeTab, setActiveTab] = useState("피드")
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [likedClothes, setLikedClothes] = useState([])
  const [likedClothesLoading, setLikedClothesLoading] = useState(false)
  const [likingInProgress, setLikingInProgress] = useState(new Set())
  const navigate = useNavigate()

  // 임시 데이터
  const [stats, setStats] = useState({
    feeds: 24,
    virtualFittings: 18,
    customClothes: 12,
    likedClothes: 0, // 실제 데이터로 업데이트될 예정
  })

  const [tabData, setTabData] = useState({
    피드: [
      {
        id: 1,
        image: "/placeholder.svg?height=300&width=300",
        title: "오늘의 OOTD",
        date: "2024-01-15",
        likes: 45,
      },
      {
        id: 2,
        image: "/placeholder.svg?height=300&width=300",
        title: "겨울 코디 추천",
        date: "2024-01-14",
        likes: 32,
      },
      {
        id: 3,
        image: "/placeholder.svg?height=300&width=300",
        title: "캐주얼 룩",
        date: "2024-01-13",
        likes: 28,
      },
      {
        id: 4,
        image: "/placeholder.svg?height=300&width=300",
        title: "데이트 코디",
        date: "2024-01-12",
        likes: 67,
      },
      {
        id: 5,
        image: "/placeholder.svg?height=300&width=300",
        title: "직장인 룩",
        date: "2024-01-11",
        likes: 23,
      },
      {
        id: 6,
        image: "/placeholder.svg?height=300&width=300",
        title: "주말 나들이",
        date: "2024-01-10",
        likes: 41,
      },
    ],
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
    "좋아요 의류": [], // 실제 데이터로 채워질 예정
  })

  // 좋아요한 의류 데이터 로드
  const loadLikedClothes = async () => {
    if (!isLoggedIn()) return

    setLikedClothesLoading(true)
    try {
      const data = await getMyLikedClothes()

      // API 응답을 컴포넌트에서 사용할 형태로 변환
      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        image: item.product_image_url,
        title: item.product_name,
        brand: item.brand_name,
        likedDate: new Date(item.liked_at).toLocaleDateString("ko-KR"), // 좋아요 누른 날짜
        category: `${item.main_category} > ${item.sub_category}`,
        gender: item.gender,
      }))

      setLikedClothes(formattedData)

      // 탭 데이터 업데이트
      setTabData((prev) => ({
        ...prev,
        "좋아요 의류": formattedData,
      }))

      // 통계 업데이트
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

  // 좋아요 취소 핸들러
  const handleLikeToggle = async (e, productId) => {
    e.stopPropagation()

    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }

    // 이미 처리 중인 경우 무시
    if (likingInProgress.has(productId)) {
      return
    }

    try {
      // 처리 중 상태 추가
      setLikingInProgress((prev) => new Set([...prev, productId]))

      const result = await toggleClothingLike(productId)

      if (!result.is_liked) {
        // 좋아요 취소된 경우 목록에서 제거
        const updatedLikedClothes = likedClothes.filter((item) => item.id !== productId)
        setLikedClothes(updatedLikedClothes)

        // 탭 데이터 업데이트
        setTabData((prev) => ({
          ...prev,
          "좋아요 의류": updatedLikedClothes,
        }))

        // 통계 업데이트
        setStats((prev) => ({
          ...prev,
          likedClothes: updatedLikedClothes.length,
        }))
      }

      // 성공 메시지 표시
      console.log(result.message)
    } catch (error) {
      console.error("좋아요 처리 실패:", error)
      alert("좋아요 처리 중 오류가 발생했습니다.")
    } finally {
      // 처리 중 상태 제거
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

    // 가상 피팅 페이지로 이동
    navigate(`/virtual-fitting/try/${productId}`)
    console.log(`가상 피팅 시작: ${productId}`)
  }

  useEffect(() => {
    const checkAuth = () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      const user = getCurrentUser()
      setUserData(user)
      setLoading(false)
    }

    checkAuth()
  }, [navigate])

  useEffect(() => {
    // 컴포넌트 마운트 시 좋아요한 의류 데이터 로드
    loadLikedClothes()
  }, [])

  const handleProfileEdit = () => {
    navigate("/profile/edit")
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
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
        navigate(`/product/${item.id}`)
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
                  <button className={styles.editProfileButton} onClick={handleProfileEdit}>
                    <span className={styles.editIcon}>✎</span>
                    프로필 수정
                  </button>
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
                        onError={(e) => {
                          e.target.style.display = "none"
                          e.target.nextSibling.style.display = "flex"
                        }}
                      />
                      <div style={{ display: "none" }} className={styles.imagePlaceholder}>
                        <ImagePlaceholder productName={item.title} />
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
                      {activeTab === "피드" && (
                        <div className={styles.contentMeta}>
                          <span className={styles.likes}>♥ {item.likes}</span>
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

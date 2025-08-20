"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import FeedItem from "../../components/FeedItem/FeedItem"
import { getFeeds } from "../../api/feeds"
import styles from "./FeedPage.module.css"

const FeedPage = () => {
  const { isAuthenticated } = useAuth()
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // 피드 목록 로드
  const loadFeeds = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await getFeeds({
        page: pageNum,
        size: 10,
        sort_by: "created_at",
        order: "desc",
      })

      if (reset) {
        setFeeds(response.feeds)
      } else {
        setFeeds((prev) => [...prev, ...response.feeds])
      }

      setHasMore(pageNum < response.total_pages)
      setPage(pageNum)
    } catch (error) {
      console.error("피드 로딩 오류:", error)
      setError("피드를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 초기 피드 로드
  useEffect(() => {
    loadFeeds(1, true)
  }, [])

  // 더 많은 피드 로드
  const loadMoreFeeds = () => {
    if (!loading && hasMore) {
      loadFeeds(page + 1, false)
    }
  }

  // 피드 업데이트 핸들러
  const handleFeedUpdate = (feedId, updatedData) => {
    setFeeds((prevFeeds) =>
      prevFeeds.map((feed) => {
        if (feed.feed_id === feedId) {
          return { ...feed, ...updatedData }
        }
        return feed
      }),
    )
  }

  // 피드 작성 페이지로 이동
  const handleCreateFeed = () => {
    if (!isAuthenticated) {
      alert("로그인이 필요한 서비스입니다.")
      return
    }
    window.location.href = "/create-feed"
  }

  // 퀵 액션 핸들러
  const handleQuickAction = (action) => {
    switch (action) {
      case "virtual-fitting":
        window.location.href = "/virtual-fitting"
        break
      case "clothing-browse":
        window.location.href = "/clothing-browse"
        break
      case "my-closet":
        window.location.href = "/my-closet"
        break
      default:
        break
    }
  }

  // 오른쪽 사이드바 렌더링
  const renderRightSidebar = () => {
    return (
      <aside className={styles.rightSidebar}>
        {/* 피드 작성 버튼 */}
        <button className={styles.createFeedButton} onClick={handleCreateFeed}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          피드 작성하기
        </button>

        {/* 바로가기 섹션 */}
        <div className={styles.sidebarSection}>
          <h3 className={styles.sidebarTitle}>바로가기</h3>
          <div className={styles.quickActions}>
            <button className={styles.quickActionButton} onClick={() => handleQuickAction("virtual-fitting")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              가상피팅
            </button>
            <button className={styles.quickActionButton} onClick={() => handleQuickAction("clothing-browse")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              의류 둘러보기
            </button>
            <button className={styles.quickActionButton} onClick={() => handleQuickAction("my-closet")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9,22 9,12 15,12 15,22"></polyline>
              </svg>
              내 옷장
            </button>
          </div>
        </div>
      </aside>
    )
  }

  // 메인 컨텐츠 렌더링
  const renderContent = () => {
    if (loading && feeds.length === 0) {
      return (
        <div className={styles.loadingContainer}>
          <div>로딩 중...</div>
        </div>
      )
    }

    if (error && feeds.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>오류가 발생했습니다</h3>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={() => loadFeeds(1, true)}>
            다시 시도
          </button>
        </div>
      )
    }

    if (feeds.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>아직 피드가 없습니다</h3>
          <p>첫 번째 패션 피드를 작성해보세요!</p>
          {isAuthenticated && (
            <button className={styles.createFirstFeedButton} onClick={handleCreateFeed}>
              첫 피드 작성하기
            </button>
          )}
        </div>
      )
    }

    return (
      <div className={styles.feedList}>
        {feeds.map((feed) => (
          <FeedItem
            key={feed.feed_id}
            feed={feed}
            onUpdate={(updatedData) => handleFeedUpdate(feed.feed_id, updatedData)}
          />
        ))}

        {/* 더 보기 버튼 */}
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button className={styles.loadMoreButton} onClick={loadMoreFeeds} disabled={loading}>
              {loading ? "로딩 중..." : "더 보기"}
            </button>
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {loading && feeds.length > 0 && (
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
            <span>피드를 불러오는 중...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      <Header />
      <div className={styles.layoutContainer}>
        {/* 왼쪽 빈 공간 */}
        <div className={styles.leftSpacer}></div>

        {/* 메인 피드 영역 */}
        <main className={styles.feedContent}>{renderContent()}</main>

        {/* 오른쪽 사이드바 */}
        {renderRightSidebar()}
      </div>
      <Footer />
    </div>
  )
}

export default FeedPage

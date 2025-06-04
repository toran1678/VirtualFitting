"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import ImageCarousel from "../../components/ImageCarousel/ImageCarousel"
import CommentSection from "../../components/CommentSection/CommentSection"
import { getFeedById, toggleFeedLike } from "../../api/feeds"
import { getProfileImageUrl, handleProfileImageError } from "../../utils/imageUtils"
import { getRelativeTime, formatDate } from "../../utils/dateUtils"
import styles from "./FeedDetailPage.module.css"

const FeedDetailPage = () => {
  const { feedId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  // 피드 데이터 로드
  useEffect(() => {
    const loadFeedData = async () => {
      try {
        setLoading(true)
        setError(null)

        const feedData = await getFeedById(feedId)
        setFeed(feedData)
        setIsLiked(feedData.is_liked || false)
        setLikeCount(feedData.like_count || 0)
        setIsFollowing(feedData.user?.isFollowing || false)
      } catch (err) {
        console.error("피드 상세 정보 로드 실패:", err)
        setError("피드를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    if (feedId) {
      loadFeedData()
    }
  }, [feedId])

  // 좋아요 처리
  const handleLike = async () => {
    if (isLikeLoading || !isAuthenticated) return

    if (!isAuthenticated) {
      if (window.confirm("로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?")) {
        navigate("/login", { state: { from: `/feed/${feedId}` } })
      }
      return
    }

    try {
      setIsLikeLoading(true)

      // 낙관적 업데이트
      const newIsLiked = !isLiked
      const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1

      setIsLiked(newIsLiked)
      setLikeCount(newLikeCount)

      // API 호출
      const response = await toggleFeedLike(feedId)

      // API 응답으로 정확한 값 업데이트
      if (response) {
        setIsLiked(response.is_liked)
        setLikeCount(response.like_count)
      }
    } catch (error) {
      console.error("좋아요 처리 오류:", error)

      // 오류 시 원래 상태로 복원
      setIsLiked(!isLiked)
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1)

      alert("좋아요 처리 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsLikeLoading(false)
    }
  }

  // 팔로우 처리
  const handleFollow = async () => {
    if (!isAuthenticated) {
      if (window.confirm("로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?")) {
        navigate("/login", { state: { from: `/feed/${feedId}` } })
      }
      return
    }

    try {
      const newIsFollowing = !isFollowing
      setIsFollowing(newIsFollowing)

      // 실제 API 호출 (추후 구현)
      // await fetch(`/api/users/${feed.user.user_id}/follow`, {
      //   method: newIsFollowing ? 'POST' : 'DELETE'
      // })
    } catch (error) {
      console.error("팔로우 처리 오류:", error)
      setIsFollowing(!isFollowing)
      alert("팔로우 처리 중 오류가 발생했습니다.")
    }
  }

  // 공유 처리
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert("링크가 클립보드에 복사되었습니다!")
    } catch (error) {
      console.error("공유 오류:", error)
      // 클립보드 API가 지원되지 않는 경우 대안
      const textArea = document.createElement("textarea")
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        alert("링크가 클립보드에 복사되었습니다!")
      } catch (fallbackError) {
        console.error("클립보드 복사 실패:", fallbackError)
        alert("링크 복사에 실패했습니다. 수동으로 복사해주세요: " + window.location.href)
      }
      document.body.removeChild(textArea)
    }
  }

  // 뒤로가기
  const handleGoBack = () => {
    navigate(-1)
  }

  // 피드 수정 페이지로 이동
  const handleEdit = () => {
    navigate(`/feed/${feedId}/edit`)
  }

  // 피드 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말로 이 피드를 삭제하시겠습니까?")) {
      return
    }

    try {
      // 실제 API 호출 (추후 구현)
      // await deleteFeed(feedId)
      alert("피드가 삭제되었습니다.")
      navigate("/feed")
    } catch (error) {
      console.error("피드 삭제 오류:", error)
      alert("피드 삭제 중 오류가 발생했습니다.")
    }
  }

  // 로딩 중 표시
  if (loading) {
    return (
      <div className={styles.feedDetailContainer}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>피드를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러 표시
  if (error || !feed) {
    return (
      <div className={styles.feedDetailContainer}>
        <Header />
        <div className={styles.errorContainer}>
          <h2>오류가 발생했습니다</h2>
          <p>{error || "피드를 찾을 수 없습니다."}</p>
          <button className={styles.backButton} onClick={handleGoBack}>
            뒤로 가기
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // 사용자 정보 안전하게 처리
  const feedUser = feed.user || {}
  const profileImageUrl = getProfileImageUrl(feedUser.profile_picture)
  const isOwner = isAuthenticated && user?.user_id === feed.user_id

  return (
    <div className={styles.feedDetailContainer}>
      <Header />

      <main className={styles.feedDetailContent}>
        {/* 뒤로가기 버튼 */}
        <div className={styles.navigationBar}>
          <button className={styles.backButton} onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            뒤로 가기
          </button>

          {/* 피드 소유자인 경우 수정/삭제 버튼 표시 */}
          {isOwner && (
            <div className={styles.ownerActions}>
              <button className={styles.editButton} onClick={handleEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                수정
              </button>
              <button className={styles.deleteButton} onClick={handleDelete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                삭제
              </button>
            </div>
          )}
        </div>

        <article className={styles.feedDetail}>
          {/* 사용자 정보 헤더 */}
          <header className={styles.feedHeader}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl || "/placeholder.svg"}
                    alt={feedUser.nickname || "사용자"}
                    onError={(e) => handleProfileImageError(e, feedUser.nickname || "User")}
                  />
                ) : (
                  <span>{(feedUser.nickname || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.userDetails}>
                <h4>{feedUser.nickname || "알 수 없는 사용자"}</h4>
                <span className={styles.feedDate} title={formatDate(feed.created_at)}>
                  {getRelativeTime(feed.created_at)}
                </span>
              </div>
            </div>
            {!isOwner && (
              <button
                className={`${styles.followButton} ${isFollowing ? styles.following : ""}`}
                onClick={handleFollow}
              >
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
            )}
          </header>

          {/* 피드 제목 */}
          <h1 className={styles.feedTitle}>{feed.title}</h1>

          {/* 이미지 갤러리 */}
          {feed.images && feed.images.length > 0 && (
            <div className={styles.imageGalleryContainer}>
              <ImageCarousel images={feed.images} alt={feed.title} />
            </div>
          )}

          {/* 피드 내용 */}
          <div className={styles.feedContent}>
            <p className={styles.feedText}>{feed.content}</p>
          </div>

          {/* 상호작용 버튼 */}
          <div className={styles.feedActions}>
            <button
              className={`${styles.actionButton} ${isLiked ? styles.liked : ""} ${isLikeLoading ? styles.loading : ""}`}
              onClick={handleLike}
              disabled={isLikeLoading}
              aria-label={isLiked ? "좋아요 취소" : "좋아요"}
              title={isLiked ? "좋아요 취소" : "좋아요"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                className={isLikeLoading ? styles.heartLoading : ""}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span className={styles.actionCount}>{likeCount}</span>
            </button>

            <button className={styles.actionButton} onClick={handleShare} aria-label="공유">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span className={styles.actionText}>공유</span>
            </button>
          </div>

          {/* 댓글 섹션 */}
          <CommentSection feedId={feedId} />
        </article>
      </main>

      <Footer />
    </div>
  )
}

export default FeedDetailPage

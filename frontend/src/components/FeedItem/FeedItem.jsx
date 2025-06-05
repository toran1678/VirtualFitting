"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import ImageCarousel from "../ImageCarousel/ImageCarousel"
import { getProfileImageUrl, handleProfileImageError } from "../../utils/imageUtils"
import { getRelativeTime } from "../../utils/dateUtils"
import { toggleFeedLike } from "../../api/feeds"
import { toggleUserFollowEnhanced } from "../../api/followSystem"
import styles from "./FeedItem.module.css"

const FeedItem = ({ feed, onUpdate }) => {
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [isLiked, setIsLiked] = useState(feed.is_liked ?? feed.isLiked ?? false)
  const [likeCount, setLikeCount] = useState(feed.like_count ?? feed.likeCount ?? 0)
  const [isFollowing, setIsFollowing] = useState(feed.user?.isFollowing || false)
  const [showFullText, setShowFullText] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // feed 데이터가 변경될 때 상태 업데이트
  useEffect(() => {
    console.log("FeedItem - 피드 데이터 업데이트:", feed)

    if (typeof feed.is_liked === "boolean") {
      setIsLiked(feed.is_liked)
    } else if (typeof feed.isLiked === "boolean") {
      setIsLiked(feed.isLiked)
    }

    if (typeof feed.like_count === "number") {
      setLikeCount(feed.like_count)
    } else if (typeof feed.likeCount === "number") {
      setLikeCount(feed.likeCount)
    }

    // 팔로우 상태 업데이트
    if (feed.user?.isFollowing !== undefined) {
      setIsFollowing(feed.user.isFollowing)
    }
  }, [feed])

  // 피드 상세 페이지로 이동
  const goToFeedDetail = () => {
    const feedId = feed.feed_id || feed.id
    navigate(`/feed/${feedId}`)
  }

  const handleLike = async (e) => {
    // 이벤트 버블링 방지
    e.stopPropagation()

    if (isLikeLoading) return

    if (!isAuthenticated) {
      alert("로그인이 필요한 기능입니다.")
      navigate("/login")
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
      const feedId = feed.feed_id || feed.id
      const response = await toggleFeedLike(feedId)

      // API 응답으로 정확한 값 업데이트
      if (response) {
        setIsLiked(response.is_liked)
        setLikeCount(response.like_count)

        // 부모 컴포넌트에 업데이트 알림
        if (onUpdate) {
          onUpdate({
            is_liked: response.is_liked,
            isLiked: response.is_liked,
            likeCount: response.like_count,
            like_count: response.like_count,
          })
        }
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

  const handleFollow = async (e) => {
    // 이벤트 버블링 방지
    e.stopPropagation()

    if (isFollowLoading) return

    if (!isAuthenticated) {
      alert("로그인이 필요한 기능입니다.")
      navigate("/login")
      return
    }

    // 자기 자신을 팔로우하려는 경우
    if (currentUser && feed.user && currentUser.user_id === feed.user.user_id) {
      return // 아무것도 하지 않음
    }

    // 사용자 이메일 정보 확인
    const userEmail = feed.user?.email
    if (!userEmail) {
      console.error("사용자 이메일 정보가 없습니다:", feed.user)
      alert("사용자 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.")
      return
    }

    try {
      setIsFollowLoading(true)

      console.log("팔로우 API 호출:", userEmail, "현재 상태:", isFollowing)

      // 낙관적 업데이트
      const newIsFollowing = !isFollowing
      setIsFollowing(newIsFollowing)

      // API 호출
      const response = await toggleUserFollowEnhanced(userEmail)
      console.log("팔로우 API 응답:", response)

      // API 응답으로 정확한 값 업데이트
      if (response) {
        setIsFollowing(response.is_following)

        // 부모 컴포넌트에 업데이트 알림
        if (onUpdate) {
          onUpdate({
            user: {
              ...feed.user,
              isFollowing: response.is_following,
              has_pending_request: response.has_pending_request || false,
            },
          })
        }

        // 팔로우 요청을 보낸 경우 메시지 표시
        if (response.message) {
          if (response.message.includes("요청")) {
            alert("팔로우 요청을 보냈습니다. 상대방이 수락하면 팔로우가 완료됩니다.")
          } else if (response.message.includes("취소")) {
            alert("팔로우 요청이 취소되었습니다.")
          } else {
            alert(response.message)
          }
        }
      }
    } catch (error) {
      console.error("팔로우 처리 오류:", error)

      // 오류 시 원래 상태로 복원
      setIsFollowing(!isFollowing)

      if (error.response?.status === 404) {
        alert("사용자를 찾을 수 없습니다.")
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.detail || ""
        if (errorMessage.includes("자기 자신")) {
          // 자기 자신 팔로우는 조용히 처리
          return
        } else if (errorMessage.includes("이미 팔로우 요청")) {
          alert("이미 팔로우 요청을 보냈습니다.")
        } else {
          alert("팔로우 처리 중 오류가 발생했습니다.")
        }
      } else if (error.response?.status === 401) {
        alert("로그인이 필요합니다.")
        navigate("/login")
      } else {
        alert("팔로우 처리 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleComment = (e) => {
    // 이벤트 버블링 방지
    e.stopPropagation()

    // 댓글 페이지로 이동
    const feedId = feed.feed_id || feed.id
    navigate(`/feed/${feedId}`, { state: { scrollToComments: true } })
  }

  const handleShare = async (e) => {
    // 이벤트 버블링 방지
    e.stopPropagation()

    try {
      const feedId = feed.feed_id || feed.id
      const shareUrl = `${window.location.origin}/feed/${feedId}`

      await navigator.clipboard.writeText(shareUrl)
      alert("링크가 클립보드에 복사되었습니다!")
    } catch (error) {
      console.error("공유 오류:", error)
      // 클립보드 API가 지원되지 않는 경우 대안
      const feedId = feed.feed_id || feed.id
      const shareUrl = `${window.location.origin}/feed/${feedId}`

      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        alert("링크가 클립보드에 복사되었습니다!")
      } catch (fallbackError) {
        console.error("클립보드 복사 실패:", fallbackError)
        alert("링크 복사에 실패했습니다. 수동으로 복사해주세요: " + shareUrl)
      }
      document.body.removeChild(textArea)
    }
  }

  const toggleText = (e) => {
    // 이벤트 버블링 방지
    e.stopPropagation()
    setShowFullText(!showFullText)
  }

  // 사용자 정보 안전하게 처리
  const user = feed.user || {}
  const profileImageUrl = getProfileImageUrl(user.profile_picture)

  // 날짜 포맷팅
  const formattedDate = getRelativeTime(feed.created_at || feed.createdAt)

  // 자기 자신인지 확인
  const isOwnFeed = currentUser && user.user_id === currentUser.user_id

  // 디버깅을 위한 로그
  console.log("FeedItem 렌더링:", {
    feedId: feed.feed_id || feed.id,
    userEmail: user.email,
    isOwnFeed,
    isFollowing,
    currentUser: currentUser?.email,
  })

  return (
    <article className={styles.feedItem} onClick={goToFeedDetail}>
      {/* 사용자 정보 헤더 */}
      <header className={styles.feedHeader} onClick={(e) => e.stopPropagation()}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl || "/placeholder.svg"}
                alt={user.nickname || "사용자"}
                onError={(e) => handleProfileImageError(e, user.nickname || "User")}
              />
            ) : (
              <span>{(user.nickname || "U").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className={styles.userDetails}>
            <h4>{user.nickname || "알 수 없는 사용자"}</h4>
            <span className={styles.feedDate} title={feed.created_at || feed.createdAt}>
              {formattedDate}
            </span>
          </div>
        </div>
        {/* 자기 자신의 피드가 아닌 경우에만 팔로우 버튼 표시 */}
        {!isOwnFeed && (
          <button
            className={`${styles.followButton} ${isFollowing ? styles.following : ""} ${
              isFollowLoading ? styles.loading : ""
            }`}
            onClick={handleFollow}
            disabled={isFollowLoading}
          >
            {isFollowLoading ? "처리중..." : isFollowing ? "팔로잉" : "팔로우"}
          </button>
        )}
      </header>

      {/* 이미지 갤러리 */}
      <div className={styles.imageGalleryWrapper}>
        <ImageCarousel images={feed.images} alt={feed.title} />
      </div>

      {/* 상호작용 버튼 */}
      <div className={styles.feedActions} onClick={(e) => e.stopPropagation()}>
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

        <button className={styles.actionButton} onClick={handleComment} aria-label="댓글">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className={styles.actionCount}>{feed.commentCount || feed.comment_count || 0}</span>
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

      {/* 피드 내용 */}
      <div className={styles.feedContent}>
        <p className={showFullText ? styles.feedTextExpanded : styles.feedText}>{feed.content}</p>
        {feed.content && feed.content.length > 100 && (
          <button className={styles.readMore} onClick={toggleText}>
            {showFullText ? "접기" : "더보기"}
          </button>
        )}
      </div>
    </article>
  )
}

export default FeedItem

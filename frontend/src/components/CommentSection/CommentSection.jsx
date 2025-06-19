"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import CommentItem from "./CommentItem"
import { getFeedComments, createFeedComment } from "../../api/feeds"
import styles from "./CommentSection.module.css"

const CommentSection = ({ feedId }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalComments, setTotalComments] = useState(0)

  // 댓글 목록 로드
  const loadComments = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 댓글 로드 요청: 피드 ${feedId}, 페이지 ${pageNum}`)

      const response = await getFeedComments(feedId, {
        page: pageNum,
        size: 10,
        tree_structure: true, // 트리 구조로 받기
      })

      console.log(`✅ 댓글 로드 완료:`, response)

      if (reset) {
        setComments(response.comments || [])
      } else {
        setComments((prev) => [...prev, ...(response.comments || [])])
      }

      setTotalComments(response.total || 0)
      setHasMore(pageNum < (response.total_pages || 1))
      setPage(pageNum)
    } catch (err) {
      console.error("댓글 로드 실패:", err)
      setError("댓글을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 초기 댓글 로드
  useEffect(() => {
    if (feedId) {
      loadComments(1, true)
    }
  }, [feedId])

  // 더 많은 댓글 로드
  const loadMoreComments = async () => {
    if (loading || !hasMore) return
    await loadComments(page + 1, false)
  }

  // 댓글 작성
  const handleSubmitComment = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      if (window.confirm("로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?")) {
        navigate("/login", { state: { from: `/feed/${feedId}` } })
      }
      return
    }

    if (!commentText.trim() || submitting) return

    try {
      setSubmitting(true)

      console.log("💬 댓글 작성 요청:", { feedId, content: commentText })

      const response = await createFeedComment(feedId, commentText.trim())

      console.log("✅ 댓글 작성 완료:", response)

      // 새 댓글을 목록 맨 위에 추가
      setComments((prev) => [response, ...prev])
      setTotalComments((prev) => prev + 1)
      setCommentText("")

      // 성공 메시지
      console.log("댓글이 성공적으로 작성되었습니다.")
    } catch (err) {
      console.error("댓글 작성 실패:", err)

      // 에러 메시지 처리
      let errorMessage = "댓글 작성 중 오류가 발생했습니다."

      if (err.response?.status === 401) {
        errorMessage = "로그인이 필요합니다."
        if (window.confirm("로그인 페이지로 이동하시겠습니까?")) {
          navigate("/login", { state: { from: `/feed/${feedId}` } })
        }
        return
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }

      alert(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // 댓글 삭제 처리
  const handleDeleteComment = async (commentId) => {
    try {
      console.log("🗑️ 댓글 삭제 요청:", { feedId, commentId })

      // 실제 API 호출
      const { deleteFeedComment } = await import("../../api/feeds")
      await deleteFeedComment(feedId, commentId)

      console.log("✅ 댓글 삭제 완료")

      // 삭제된 댓글을 목록에서 제거 (대댓글도 함께 제거됨)
      setComments((prev) => removeCommentFromTree(prev, commentId))
      setTotalComments((prev) => prev - 1)

      console.log("댓글이 성공적으로 삭제되었습니다.")
    } catch (err) {
      console.error("댓글 삭제 실패:", err)

      let errorMessage = "댓글 삭제 중 오류가 발생했습니다."
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }

      alert(errorMessage)
    }
  }

  // 대댓글 작성 처리
  const handleReplyComment = async (parentId, content) => {
    if (!isAuthenticated) {
      if (window.confirm("로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?")) {
        navigate("/login", { state: { from: `/feed/${feedId}` } })
      }
      return
    }

    try {
      const response = await createFeedComment(feedId, content.trim(), parentId)

      // 대댓글을 해당 부모 댓글에 추가
      setComments((prev) => addReplyToTree(prev, parentId, response))
      setTotalComments((prev) => prev + 1)

      return response
    } catch (err) {
      let errorMessage = "대댓글 작성 중 오류가 발생했습니다."
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }

      throw new Error(errorMessage)
    }
  }

  // 댓글 트리에서 댓글 제거하는 헬퍼 함수
  const removeCommentFromTree = (comments, commentId) => {
    return comments.filter((comment) => {
      if (comment.comment_id === commentId) {
        return false // 해당 댓글 제거
      }

      // 대댓글에서도 제거
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = removeCommentFromTree(comment.replies, commentId)
      }

      return true
    })
  }

  // 댓글 트리에 대댓글 추가하는 헬퍼 함수
  const addReplyToTree = (comments, parentId, newReply) => {
    return comments.map((comment) => {
      if (comment.comment_id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
          reply_count: (comment.reply_count || 0) + 1,
        }
      }

      // 중첩된 대댓글에서도 찾기
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToTree(comment.replies, parentId, newReply),
        }
      }

      return comment
    })
  }

  return (
    <section className={styles.commentSection}>
      <h2 className={styles.commentTitle}>
        댓글 <span className={styles.commentCount}>{totalComments}</span>
      </h2>

      {/* 댓글 작성 폼 */}
      <form className={styles.commentForm} onSubmit={handleSubmitComment}>
        <textarea
          className={styles.commentInput}
          placeholder={isAuthenticated ? "댓글을 작성해주세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={!isAuthenticated || submitting}
          maxLength={500}
        />
        <div className={styles.commentFormFooter}>
          <span className={styles.characterCount}>{commentText.length}/500</span>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={!isAuthenticated || !commentText.trim() || submitting}
          >
            {submitting ? "작성 중..." : "댓글 작성"}
          </button>
        </div>
      </form>

      {/* 댓글 목록 */}
      <div className={styles.commentList}>
        {loading && comments.length === 0 ? (
          <div className={styles.commentLoading}>댓글을 불러오는 중...</div>
        ) : error ? (
          <div className={styles.commentError}>{error}</div>
        ) : comments.length === 0 ? (
          <div className={styles.noComments}>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.comment_id}
                comment={comment}
                feedId={feedId}
                onDelete={handleDeleteComment}
                onReply={handleReplyComment}
              />
            ))}

            {/* 더 보기 버튼 */}
            {hasMore && (
              <button className={styles.loadMoreButton} onClick={loadMoreComments} disabled={loading}>
                {loading ? "불러오는 중..." : "댓글 더 보기"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default CommentSection

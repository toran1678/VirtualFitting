"use client"

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { getProfileImageUrl, handleProfileImageError } from "../../utils/imageUtils"
import { getRelativeTime } from "../../utils/dateUtils"
import styles from "./CommentItem.module.css"

const CommentItem = ({ comment, feedId, onDelete, onReply, level = 0 }) => {
  const { user } = useAuth()
  const [showOptions, setShowOptions] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  // 사용자 정보 안전하게 처리
  const commentUser = comment.user || {}
  const profileImageUrl = getProfileImageUrl(commentUser.profile_picture)
  const isOwner = user?.user_id === comment.user_id

  // 댓글 작성 시간
  const formattedDate = getRelativeTime(comment.created_at)

  // 최대 중첩 레벨 제한 (3단계까지만)
  const maxLevel = 2
  const isMaxLevel = level >= maxLevel

  // 옵션 메뉴 토글
  const toggleOptions = () => {
    setShowOptions((prev) => !prev)
  }

  // 댓글 삭제
  const handleDelete = () => {
    if (window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      onDelete(comment.comment_id)
      setShowOptions(false)
    }
  }

  // 답글 폼 토글
  const toggleReplyForm = () => {
    setShowReplyForm((prev) => !prev)
    setReplyText("")
  }

  // 답글 작성
  const handleSubmitReply = async (e) => {
    e.preventDefault()

    if (!replyText.trim() || submittingReply) return

    try {
      setSubmittingReply(true)

      await onReply(comment.comment_id, replyText.trim())

      setReplyText("")
      setShowReplyForm(false)
    } catch (error) {
      alert(error.message || "대댓글 작성 중 오류가 발생했습니다.")
    } finally {
      setSubmittingReply(false)
    }
  }

  // 답글 표시/숨기기 토글
  const toggleReplies = () => {
    setShowReplies((prev) => !prev)
  }

  return (
    <div className={`${styles.commentItem} ${level > 0 ? styles.reply : ""}`} style={{ marginLeft: `${level * 20}px` }}>
      {/* 댓글 내용 */}
      <div className={styles.commentMain}>
        {/* 사용자 아바타 */}
        <div className={styles.commentAvatar}>
          {profileImageUrl ? (
            <img
              src={profileImageUrl || "/placeholder.svg"}
              alt={commentUser.nickname || "사용자"}
              onError={(e) => handleProfileImageError(e, commentUser.nickname || "User")}
            />
          ) : (
            <span>{(commentUser.nickname || "U").charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* 댓글 내용 */}
        <div className={styles.commentContent}>
          <div className={styles.commentHeader}>
            <h4 className={styles.commentAuthor}>{commentUser.nickname || "알 수 없는 사용자"}</h4>
            <span className={styles.commentDate}>{formattedDate}</span>
          </div>

          <p className={styles.commentText}>{comment.content}</p>

          {/* 댓글 액션 버튼들 */}
          <div className={styles.commentActions}>
            {!isMaxLevel && (
              <button className={styles.replyButton} onClick={toggleReplyForm}>
                답글
              </button>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <button className={styles.toggleRepliesButton} onClick={toggleReplies}>
                {showReplies ? "답글 숨기기" : `답글 ${comment.replies.length}개 보기`}
              </button>
            )}
          </div>
        </div>

        {/* 옵션 버튼 (본인 댓글인 경우만) */}
        {isOwner && (
          <div className={styles.commentOptions}>
            <button className={styles.optionsButton} onClick={toggleOptions} aria-label="댓글 옵션">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </button>

            {showOptions && (
              <div className={styles.optionsMenu}>
                <button className={styles.deleteOption} onClick={handleDelete}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 답글 작성 폼 */}
      {showReplyForm && (
        <form className={styles.replyForm} onSubmit={handleSubmitReply}>
          <div className={styles.replyInputContainer}>
            <textarea
              className={styles.replyInput}
              placeholder="답글을 작성해주세요..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={submittingReply}
              maxLength={500}
            />
            <div className={styles.replyFormActions}>
              <span className={styles.characterCount}>{replyText.length}/500</span>
              <div className={styles.replyButtons}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={toggleReplyForm}
                  disabled={submittingReply}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles.submitReplyButton}
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? "작성 중..." : "답글 작성"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 대댓글 목록 */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className={styles.repliesList}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.comment_id}
              comment={reply}
              feedId={feedId}
              onDelete={onDelete}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentItem

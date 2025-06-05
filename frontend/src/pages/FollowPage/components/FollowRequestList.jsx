"use client"

import { getProfileImageUrl, handleProfileImageError } from "../../../utils/imageUtils"
import { getRelativeTime } from "../../../utils/dateUtils"
import styles from "../FollowPage.module.css"

const FollowRequestList = ({ requests, loading, onAccept, onReject, actionInProgress }) => {
  if (loading) {
    return (
      <div className={styles.requestsLoadingContainer}>
        <div className={styles.spinner}></div>
        <p>요청을 불러오는 중...</p>
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return null // 요청이 없으면 아무것도 표시하지 않음
  }

  return (
    <div className={styles.requestsContainer}>
      <h2 className={styles.requestsTitle}>팔로우 요청</h2>
      <div className={styles.requestsList}>
        {requests.map((request) => {
          const profileImageUrl = getProfileImageUrl(request.user.profile_picture)
          const isProcessing = actionInProgress.has(request.request_id)

          return (
            <div key={request.request_id} className={styles.requestItem}>
              <div className={styles.requestUserInfo}>
                <div className={styles.requestUserAvatar}>
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl || "/placeholder.svg"}
                      alt={request.user.nickname}
                      onError={(e) => handleProfileImageError(e, request.user.nickname)}
                    />
                  ) : (
                    <span>{(request.user.nickname || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.requestUserDetails}>
                  <h3 className={styles.requestUserName}>{request.user.nickname}</h3>
                  <p className={styles.requestUserEmail}>{request.user.email}</p>
                  <p className={styles.requestTime}>요청 시간: {getRelativeTime(request.created_at)}</p>
                </div>
              </div>

              <div className={styles.requestActions}>
                <button
                  className={styles.acceptButton}
                  onClick={() => onAccept(request.request_id, request.user.email)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "처리중..." : "수락"}
                </button>
                <button
                  className={styles.rejectButton}
                  onClick={() => onReject(request.request_id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "처리중..." : "거절"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FollowRequestList

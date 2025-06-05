"use client"

import { getProfileImageUrl, handleProfileImageError } from "../../../utils/imageUtils"
import styles from "../FollowPage.module.css"

const SentRequestList = ({ requests, loading, onCancel, actionInProgress }) => {
  if (loading) {
    return (
      <div className={styles.requestsContainer}>
        <h2 className={styles.requestsTitle}>보낸 팔로우 요청</h2>
        <div className={styles.requestsLoadingContainer}>
          <div className={styles.spinner}></div>
          <p>요청 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return null // 보낸 요청이 없으면 섹션 자체를 숨김
  }

  return (
    <div className={styles.requestsContainer}>
      <h2 className={styles.requestsTitle}>
        보낸 팔로우 요청 <span className={styles.count}>{requests.length}</span>
      </h2>
      <div className={styles.requestsList}>
        {requests.map((request) => {
          const user = request.user
          const profileImageUrl = getProfileImageUrl(user.profile_picture)
          const isProcessing = actionInProgress.has(user.email)

          return (
            <div key={request.request_id} className={styles.requestItem}>
              <div className={styles.requestUserInfo}>
                <div className={styles.requestUserAvatar}>
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl || "/placeholder.svg"}
                      alt={user.nickname}
                      onError={(e) => handleProfileImageError(e, user.nickname)}
                    />
                  ) : (
                    <span>{(user.nickname || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.requestUserDetails}>
                  <h3 className={styles.requestUserName}>{user.nickname}</h3>
                  <p className={styles.requestUserEmail}>{user.email}</p>
                  <p className={styles.requestTime}>
                    {new Date(request.created_at).toLocaleDateString("ko-KR")}에 요청함
                  </p>
                </div>
              </div>
              <div className={styles.requestActions}>
                <button className={styles.cancelButton} onClick={() => onCancel(user.email)} disabled={isProcessing}>
                  {isProcessing ? "처리중..." : "취소"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SentRequestList

"use client"

import FollowButton from "../../../components/FollowButton/FollowButton"
import { getProfileImageUrl, handleProfileImageError } from "../../../utils/imageUtils"
import styles from "../FollowPage.module.css"

const FollowList = ({ users, loading, isCurrentUser, onUserClick, emptyMessage }) => {
  if (loading) {
    return (
      <div className={styles.listLoadingContainer}>
        <div className={styles.spinner}></div>
        <p>목록을 불러오는 중...</p>
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className={styles.emptyListContainer}>
        <div className={styles.emptyIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={styles.userListContainer}>
      {users.map((user) => {
        const profileImageUrl = getProfileImageUrl(user.profile_picture)

        return (
          <div key={user.user_id} className={styles.userListItem}>
            {/* 사용자 정보 */}
            <div className={styles.userListInfo} onClick={() => onUserClick(user.email)}>
              <div className={styles.userListAvatar}>
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
              <div className={styles.userListDetails}>
                <h3 className={styles.userListName}>{user.nickname}</h3>
                <p className={styles.userListEmail}>{user.email}</p>
                {user.bio && <p className={styles.userListBio}>{user.bio}</p>}
              </div>
            </div>

            {/* 팔로우 버튼 (FollowButton 컴포넌트 사용) */}
            <FollowButton
              userEmail={user.email}
              initialFollowState={user.is_following}
              size="small"
              className={styles.followListButton}
            />
          </div>
        )
      })}
    </div>
  )
}

export default FollowList

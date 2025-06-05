"use client"

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { toggleUserFollow } from "../../api/userProfiles"
import styles from "./FollowButton.module.css"

const FollowButton = ({
  userEmail,
  initialFollowState = false,
  initialHasPendingRequest = false,
  onFollowChange,
  className = "",
  size = "medium", // small, medium, large
}) => {
  const { user: currentUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [isFollowing, setIsFollowing] = useState(initialFollowState)
  const [hasPendingRequest, setHasPendingRequest] = useState(initialHasPendingRequest)
  const [isLoading, setIsLoading] = useState(false)

  // 자기 자신인지 확인
  const isOwnAccount = currentUser && currentUser.email === userEmail

  // 자기 자신의 계정이면 버튼을 표시하지 않음
  if (isOwnAccount) {
    return null
  }

  const handleFollow = async () => {
    if (isLoading) return

    if (!isAuthenticated) {
      if (window.confirm("로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?")) {
        navigate("/login")
      }
      return
    }

    try {
      setIsLoading(true)

      console.log("팔로우 API 호출:", userEmail, "현재 상태:", { isFollowing, hasPendingRequest })

      const response = await toggleUserFollow(userEmail)
      console.log("팔로우 API 응답:", response)

      // 응답에 따라 상태 업데이트
      setIsFollowing(response.is_following)
      setHasPendingRequest(response.has_pending_request || false)

      // 부모 컴포넌트에 변경 사항 알림
      if (onFollowChange) {
        onFollowChange({
          isFollowing: response.is_following,
          hasPendingRequest: response.has_pending_request || false,
          followersCount: response.followers_count,
          message: response.message,
        })
      }

      // 사용자에게 결과 알림
      if (response.message) {
        // 성공 메시지는 토스트나 다른 방식으로 표시할 수 있음
        console.log("팔로우 결과:", response.message)
      }
    } catch (error) {
      console.error("팔로우 처리 오류:", error)

      let errorMessage = "팔로우 처리 중 오류가 발생했습니다."

      if (error.response?.status === 404) {
        errorMessage = "사용자를 찾을 수 없습니다."
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || "잘못된 요청입니다."
      } else if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다."
        navigate("/login")
        return
      }

      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (isLoading) return "처리중..."
    if (hasPendingRequest) return "요청됨"
    if (isFollowing) return "팔로잉"
    return "팔로우"
  }

  // 버튼 상태에 따른 클래스 결정
  const getButtonClass = () => {
    const classes = [styles.followButton, styles[size]]

    if (className) classes.push(className)
    if (isLoading) classes.push(styles.loading)
    if (isFollowing) classes.push(styles.following)
    if (hasPendingRequest) classes.push(styles.pending)

    return classes.join(" ")
  }

  return (
    <button
      className={getButtonClass()}
      onClick={handleFollow}
      disabled={isLoading}
      title={hasPendingRequest ? "팔로우 요청이 전송되었습니다" : isFollowing ? "언팔로우" : "팔로우"}
    >
      <span className={styles.buttonText}>{getButtonText()}</span>
      {isFollowing && <span className={styles.hoverText}>언팔로우</span>}
    </button>
  )
}

export default FollowButton

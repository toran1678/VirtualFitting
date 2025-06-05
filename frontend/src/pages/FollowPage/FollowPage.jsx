"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import FollowList from "./components/FollowList"
import FollowRequestList from "./components/FollowRequestList"
import SentRequestList from "./components/SentRequestList"
import {
  getUserFollowers,
  getUserFollowing,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest,
  getUserProfileByEmail,
  toggleUserFollow,
} from "../../api/userProfiles"
import { getSentFollowRequests } from "../../api/followSystem"
import { getProfileImageUrl } from "../../utils/imageUtils"
import styles from "./FollowPage.module.css"

const FollowPage = () => {
  const { email } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser, isAuthenticated } = useAuth()

  // 현재 활성화된 탭 (팔로잉 또는 팔로워)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "followers")

  // 사용자 데이터 및 로딩 상태
  const [userData, setUserData] = useState(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 팔로잉/팔로워 데이터
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [followRequests, setFollowRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])

  // 로딩 상태
  const [followersLoading, setFollowersLoading] = useState(false)
  const [followingLoading, setFollowingLoading] = useState(false)
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [sentRequestsLoading, setSentRequestsLoading] = useState(false)

  // 팔로우 액션 상태
  const [followActionInProgress, setFollowActionInProgress] = useState(new Set())
  const [requestActionInProgress, setRequestActionInProgress] = useState(new Set())

  // URL 파라미터 변경 감지 및 탭 동기화
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && (tabParam === "following" || tabParam === "followers")) {
      setActiveTab(tabParam)
    } else {
      // 기본 탭 설정
      setSearchParams({ tab: "followers" })
    }
  }, [searchParams, setSearchParams])

  // 초기 사용자 정보 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!email) {
        navigate("/not-found")
        return
      }

      setLoading(true)
      setError(null)

      try {
        // 사용자 정보 API 호출
        const profileData = await getUserProfileByEmail(email)

        setUserData(profileData)

        // 현재 로그인한 사용자와 조회 대상 사용자가 같은지 확인
        const isSameUser = currentUser && currentUser.email === email
        setIsCurrentUser(isSameUser)

        setLoading(false)
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error)
        setError("사용자 정보를 불러오는 중 오류가 발생했습니다.")
        setLoading(false)
      }
    }

    loadUserData()
  }, [email, currentUser, navigate])

  // 사용자 정보 로드 완료 후 데이터 로드
  useEffect(() => {
    if (!userData || loading) return

    const canViewData = !userData.is_private || userData.is_following || isCurrentUser

    if (canViewData) {
      // 현재 활성 탭에 따라 데이터 로드
      if (activeTab === "followers") {
        loadFollowers()
      } else {
        loadFollowing()
      }

      // 본인 계정인 경우 항상 팔로우 요청 목록 로드 (탭과 관계없이)
      if (isCurrentUser) {
        loadFollowRequests()
        loadSentRequests()
      }
    }
  }, [userData, isCurrentUser, activeTab])

  // 팔로워 목록 로드
  const loadFollowers = async () => {
    if (!email) return

    setFollowersLoading(true)
    try {
      const data = await getUserFollowers(email)
      console.log("팔로워 데이터:", data)
      setFollowers(data)
    } catch (error) {
      console.error("팔로워 목록 로드 실패:", error)
      setFollowers([])
    } finally {
      setFollowersLoading(false)
    }
  }

  // 팔로잉 목록 로드
  const loadFollowing = async () => {
    if (!email) return

    setFollowingLoading(true)
    try {
      const data = await getUserFollowing(email)
      console.log("팔로잉 데이터:", data)
      setFollowing(data)
    } catch (error) {
      console.error("팔로잉 목록 로드 실패:", error)
      setFollowing([])
    } finally {
      setFollowingLoading(false)
    }
  }

  // 팔로우 요청 목록 로드 (본인 계정인 경우만)
  const loadFollowRequests = async () => {
    if (!isAuthenticated || !isCurrentUser) return

    setRequestsLoading(true)
    try {
      const data = await getFollowRequests()
      console.log("팔로우 요청 데이터:", data)
      setFollowRequests(data)
    } catch (error) {
      console.error("팔로우 요청 목록 로드 실패:", error)
      setFollowRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }

  // 보낸 팔로우 요청 목록 로드 (본인 계정인 경우만)
  const loadSentRequests = async () => {
    if (!isAuthenticated || !isCurrentUser) return

    setSentRequestsLoading(true)
    try {
      const data = await getSentFollowRequests()
      console.log("보낸 팔로우 요청 데이터:", data)
      setSentRequests(data)
    } catch (error) {
      console.error("보낸 팔로우 요청 목록 로드 실패:", error)
      setSentRequests([])
    } finally {
      setSentRequestsLoading(false)
    }
  }

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setSearchParams({ tab })

    // 탭 변경 시 해당 데이터 로드
    if (tab === "followers" && followers.length === 0 && !followersLoading) {
      loadFollowers()
    } else if (tab === "following" && following.length === 0 && !followingLoading) {
      loadFollowing()
    }
  }

  // 팔로우 요청 수락 핸들러
  const handleAcceptRequest = async (requestId, userEmail) => {
    if (requestActionInProgress.has(requestId)) return

    setRequestActionInProgress((prev) => new Set([...prev, requestId]))

    try {
      await acceptFollowRequest(requestId)

      // 요청 목록에서 제거하고 팔로워 목록 다시 로드
      setFollowRequests((prev) => prev.filter((req) => req.request_id !== requestId))

      // 사용자 데이터의 팔로워 수 업데이트
      setUserData((prev) => ({
        ...prev,
        followers_count: (prev.followers_count || 0) + 1,
      }))

      // 현재 팔로워 탭이 활성화되어 있으면 목록 다시 로드
      if (activeTab === "followers") {
        loadFollowers()
      }

      alert("팔로우 요청을 수락했습니다.")
    } catch (error) {
      console.error("팔로우 요청 수락 실패:", error)
      alert("요청 처리 중 오류가 발생했습니다.")
    } finally {
      setRequestActionInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  // 팔로우 요청 거절 핸들러
  const handleRejectRequest = async (requestId) => {
    if (requestActionInProgress.has(requestId)) return

    setRequestActionInProgress((prev) => new Set([...prev, requestId]))

    try {
      await rejectFollowRequest(requestId)

      // 요청 목록에서 제거
      setFollowRequests((prev) => prev.filter((req) => req.request_id !== requestId))

      alert("팔로우 요청을 거절했습니다.")
    } catch (error) {
      console.error("팔로우 요청 거절 실패:", error)
      alert("요청 처리 중 오류가 발생했습니다.")
    } finally {
      setRequestActionInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  // 보낸 팔로우 요청 취소 핸들러
  const handleCancelRequest = async (userEmail) => {
    if (requestActionInProgress.has(userEmail)) return

    setRequestActionInProgress((prev) => new Set([...prev, userEmail]))

    try {
      await cancelFollowRequest(userEmail)

      // 보낸 요청 목록에서 제거
      setSentRequests((prev) => prev.filter((req) => req.user.email !== userEmail))

      alert("팔로우 요청을 취소했습니다.")
    } catch (error) {
      console.error("팔로우 요청 취소 실패:", error)
      alert("요청 처리 중 오류가 발생했습니다.")
    } finally {
      setRequestActionInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userEmail)
        return newSet
      })
    }
  }

  // 팔로우/언팔로우 핸들러
  const handleFollowToggle = async (userEmail) => {
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }

    setFollowActionInProgress((prev) => new Set([...prev, userEmail]))

    try {
      const result = await toggleUserFollow(userEmail)

      // 팔로잉 목록에서 해당 사용자 상태 업데이트
      if (activeTab === "following") {
        setFollowing((prev) =>
          prev.map((user) => (user.email === userEmail ? { ...user, is_following: result.is_following } : user)),
        )
      }

      // 팔로워 목록에서 해당 사용자 상태 업데이트
      if (activeTab === "followers") {
        setFollowers((prev) =>
          prev.map((user) => (user.email === userEmail ? { ...user, is_following: result.is_following } : user)),
        )
      }

      alert(result.is_following ? "팔로우했습니다." : "언팔로우했습니다.")
    } catch (error) {
      console.error("팔로우 토글 실패:", error)
      alert("팔로우 처리 중 오류가 발생했습니다.")
    } finally {
      setFollowActionInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userEmail)
        return newSet
      })
    }
  }

  // 사용자 프로필로 이동
  const handleUserClick = (userEmail) => {
    if (currentUser && currentUser.email === userEmail) {
      navigate("/mypage")
    } else {
      navigate(`/profile/${userEmail}`)
    }
  }

  // 뒤로가기
  const handleGoBack = () => {
    navigate(-1)
  }

  // 로딩 중 표시
  if (loading) {
    return (
      <div className={styles.followPageContainer}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>정보를 불러오는 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러 표시
  if (error || !userData) {
    return (
      <div className={styles.followPageContainer}>
        <Header />
        <div className={styles.errorContainer}>
          <h2>오류가 발생했습니다</h2>
          <p>{error || "사용자 정보를 찾을 수 없습니다."}</p>
          <button className={styles.backButton} onClick={handleGoBack}>
            뒤로 가기
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  // 비공개 계정이고 팔로우하지 않은 경우
  const isPrivateAndNotFollowing = userData.is_private && !userData.is_following && !isCurrentUser

  return (
    <div className={styles.followPageContainer}>
      <Header />

      <main className={styles.followPageContent}>
        {/* 뒤로가기 버튼 */}
        <div className={styles.navigationBar}>
          <button className={styles.backButton} onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            뒤로 가기
          </button>
        </div>

        {/* 사용자 정보 헤더 */}
        <div className={styles.userHeader}>
          <div className={styles.userAvatar}>
            {userData.profile_picture ? (
              <img
                src={getProfileImageUrl(userData.profile_picture) || "/placeholder.svg"}
                alt={userData.nickname || "사용자"}
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>{(userData.nickname || "U").charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className={styles.userInfo}>
            <h1 className={styles.userName}>{userData.nickname || "사용자"}</h1>
            <p className={styles.userEmail}>{userData.email}</p>
          </div>

          {/* 팔로우 버튼 (자기 자신이 아닌 경우만) */}
          {!isCurrentUser && (
            <button
              className={`${styles.followButton} ${userData.is_following ? styles.following : ""}`}
              onClick={() => handleFollowToggle(userData.email)}
              disabled={followActionInProgress.has(userData.email)}
            >
              {followActionInProgress.has(userData.email) ? "처리중..." : userData.is_following ? "팔로잉" : "팔로우"}
            </button>
          )}
        </div>

        {/* 비공개 계정 메시지 */}
        {isPrivateAndNotFollowing ? (
          <div className={styles.privateAccountMessage}>
            <div className={styles.privateIcon}>🔒</div>
            <h2>비공개 계정입니다</h2>
            <p>이 사용자의 팔로잉/팔로워 목록을 보려면 팔로우 요청을 보내세요.</p>
            <button
              className={styles.followButton}
              onClick={() => handleFollowToggle(userData.email)}
              disabled={followActionInProgress.has(userData.email)}
            >
              {followActionInProgress.has(userData.email) ? "처리중..." : "팔로우"}
            </button>
          </div>
        ) : (
          <>
            {/* 탭 버튼 */}
            <div className={styles.tabButtons}>
              <button
                className={`${styles.tabButton} ${activeTab === "followers" ? styles.active : ""}`}
                onClick={() => handleTabChange("followers")}
              >
                팔로워 <span className={styles.count}>{userData.followers_count || 0}</span>
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === "following" ? styles.active : ""}`}
                onClick={() => handleTabChange("following")}
              >
                팔로잉 <span className={styles.count}>{userData.following_count || 0}</span>
              </button>
            </div>

            {/* 팔로우 요청 목록 (본인 계정이고 팔로워 탭인 경우만 표시) */}
            {isCurrentUser && activeTab === "followers" && (
              <FollowRequestList
                requests={followRequests}
                loading={requestsLoading}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
                actionInProgress={requestActionInProgress}
              />
            )}

            {/* 보낸 팔로우 요청 목록 (본인 계정이고 팔로잉 탭인 경우만 표시) */}
            {isCurrentUser && activeTab === "following" && (
              <SentRequestList
                requests={sentRequests}
                loading={sentRequestsLoading}
                onCancel={handleCancelRequest}
                actionInProgress={requestActionInProgress}
              />
            )}

            {/* 팔로워/팔로잉 목록 */}
            {activeTab === "followers" ? (
              <FollowList
                users={followers}
                loading={followersLoading}
                isCurrentUser={isCurrentUser}
                onUserClick={handleUserClick}
                onFollowToggle={handleFollowToggle}
                followActionInProgress={followActionInProgress}
                emptyMessage="아직 팔로워가 없습니다."
              />
            ) : (
              <FollowList
                users={following}
                loading={followingLoading}
                isCurrentUser={isCurrentUser}
                onUserClick={handleUserClick}
                onFollowToggle={handleFollowToggle}
                followActionInProgress={followActionInProgress}
                emptyMessage="아직 팔로잉하는 사용자가 없습니다."
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default FollowPage

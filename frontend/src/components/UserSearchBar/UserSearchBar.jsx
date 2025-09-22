import { useState, useEffect, useRef } from "react"
import { searchUsers } from "../../api/userProfiles"
import { getProfileImageUrl } from "../../utils/imageUtils"
import styles from "./UserSearchBar.module.css"

const UserSearchBar = ({ onUserClick, onFollowToggle, followActionInProgress, currentUserEmail }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchRef = useRef(null)
  const resultsRef = useRef(null)

  // 검색어 변경 시 디바운스된 검색 실행
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim())
      } else {
        setSearchResults([])
        setHasSearched(false)
      }
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // 외부 클릭 시 검색 결과 숨기기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const performSearch = async (query) => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await searchUsers({ q: query, page: 1, size: 10 })
      setSearchResults(response.users || [])
      setHasSearched(true)
      setShowResults(true)
    } catch (error) {
      console.error("사용자 검색 실패:", error)
      setSearchResults([])
      setHasSearched(true)
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleUserClick = (user) => {
    setShowResults(false)
    setSearchQuery("")
    onUserClick(user.email)
  }

  const handleFollowToggle = async (e, userEmail) => {
    e.stopPropagation()
    await onFollowToggle(userEmail)
  }

  const isCurrentUser = (userEmail) => {
    return currentUserEmail === userEmail
  }

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchInputContainer} ref={searchRef}>
        <div className={styles.searchIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="사용자 이름 또는 이메일로 검색..."
          value={searchQuery}
          onChange={handleInputChange}
          className={styles.searchInput}
        />
        {isSearching && (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className={styles.searchResults} ref={resultsRef}>
          {searchResults.length > 0 ? (
            <div className={styles.resultsList}>
              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className={styles.resultItem}
                  onClick={() => handleUserClick(user)}
                >
                  <div className={styles.userAvatar}>
                    {user.profile_picture ? (
                      <img
                        src={getProfileImageUrl(user.profile_picture) || "/placeholder.svg"}
                        alt={user.nickname || "사용자"}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {(user.nickname || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.nickname || "사용자"}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                    <div className={styles.userStats}>
                      팔로워 {user.followers_count || 0} · 팔로잉 {user.following_count || 0}
                    </div>
                  </div>
                  {!isCurrentUser(user.email) && (
                    <button
                      className={`${styles.followButton} ${
                        user.is_following 
                          ? styles.following 
                          : user.has_pending_request 
                          ? styles.requested 
                          : ""
                      }`}
                      onClick={(e) => handleFollowToggle(e, user.email)}
                      disabled={followActionInProgress.has(user.email) || user.has_pending_request}
                    >
                      {followActionInProgress.has(user.email)
                        ? "처리중..."
                        : user.is_following
                        ? "팔로잉"
                        : user.has_pending_request
                        ? "요청됨"
                        : "팔로우"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <p>검색 결과가 없습니다</p>
              <p className={styles.noResultsSubtext}>다른 검색어를 시도해보세요</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default UserSearchBar

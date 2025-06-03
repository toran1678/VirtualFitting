"use client"

import { useState, useContext, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/Header.css"
import { ThemeContext } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import Sidebar from "./Sidebar"
import { getProfileImageUrl, handleImageError } from "../utils/imageUtils"

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { darkMode, toggleTheme } = useContext(ThemeContext)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // 스크롤 감지 효과
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 헤더가 있는 페이지임을 body에 표시
  useEffect(() => {
    document.body.classList.add("has-header")

    return () => {
      document.body.classList.remove("has-header")
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    console.log("검색어:", searchQuery)
  }

  const handleLoginLogout = async () => {
    if (isAuthenticated) {
      try {
        await logout()
        // 헤더에서는 새로고침 유지 (필요한 경우)
        window.location.reload()
      } catch (error) {
        console.error("로그아웃 오류:", error)
        alert("로그아웃 중 오류가 발생했습니다.")
      }
    } else {
      navigate("/login")
    }
  }

  const toggleSidebar = () => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    if (!sidebarOpen) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.paddingRight = "0"
      document.body.style.overflow = ""
    }

    setSidebarOpen(!sidebarOpen)
  }

  return (
    <>
      <header className={`header ${isScrolled ? "scrolled" : ""}`}>
        <div className="header-container">
          {/* 왼쪽 영역: 로고 + 검색창 */}
          <div className="header-left">
            <div className="logo-container">
              <button
                className={`hamburger-button ${sidebarOpen ? "active" : ""}`}
                onClick={toggleSidebar}
                aria-label="메뉴 열기"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
              <div className="logo">
                <Link to="/">FASHION GUYS</Link>
              </div>
            </div>

            <div className="search-bar">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="브랜드, 상품을 검색해보세요."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" aria-label="검색">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* 오른쪽 영역: 네비게이션 + 로그인/프로필 */}
          <div className="header-right">
            <nav className="navigation">
              <ul>
                <li className="nav-item">
                  <Link to="/clothing-browse">의류</Link>
                </li>
                <li className="nav-item">
                  <Link to="/virtual-fitting">가상피팅</Link>
                </li>
                <li className="nav-item">
                  <Link to="/custom">커스텀</Link>
                </li>
                <li className="nav-item">
                  <Link to="/feed">피드</Link>
                </li>

                {isAuthenticated && (
                  <li className="nav-item">
                    <Link to="/mypage">마이페이지</Link>
                  </li>
                )}

                <li>
                  <button className="theme-toggle" onClick={toggleTheme} aria-label="테마 전환">
                    {darkMode ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                      </svg>
                    )}
                  </button>
                </li>

                {isAuthenticated ? (
                  <li className="user-profile-container">
                    <div className="user-profile">
                      <div className="profile-image">
                        {user?.profile_picture ? (
                          <img
                            src={getProfileImageUrl(user.profile_picture) || "/placeholder.svg"}
                            alt="프로필"
                            onError={(e) =>
                              handleImageError(e, "/placeholder.svg?height=32&width=32&query=user profile")
                            }
                          />
                        ) : (
                          <div className="profile-initial">{user?.nickname?.charAt(0) || "U"}</div>
                        )}
                      </div>
                      <span className="user-name">{user?.nickname || "사용자"}</span>
                      <button className="logout-button" onClick={handleLoginLogout}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>로그아웃</span>
                      </button>
                    </div>
                  </li>
                ) : (
                  <li className="auth-buttons">
                    <button className="header-login-button" onClick={handleLoginLogout}>
                      로그인
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isLoggedIn={isAuthenticated} userData={user} />
    </>
  )
}

export default Header

"use client"

import { useState, useContext, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/Header.css"
import { ThemeContext } from "../context/ThemeContext"
import Sidebar from "./Sidebar"
import { isLoggedIn, getCurrentUser, logoutUser } from "../api/auth"

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [userData, setUserData] = useState(null)
  const { darkMode, toggleTheme } = useContext(ThemeContext)
  const navigate = useNavigate()

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      const loginStatus = isLoggedIn()
      setUserLoggedIn(loginStatus)

      if (loginStatus) {
        setUserData(getCurrentUser())
      } else {
        setUserData(null)
      }
    }

    // 초기 로그인 상태 확인
    checkLoginStatus()

    // 로컬 스토리지 변경 이벤트 리스너 추가
    const handleStorageChange = () => {
      checkLoginStatus()
    }

    window.addEventListener("storage", handleStorageChange)

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    console.log("검색어:", searchQuery)
    // 검색 기능 구현
  }

  const handleLoginLogout = async () => {
    if (userLoggedIn) {
      // 로그아웃 처리
      try {
        await logoutUser()
        setUserLoggedIn(false)
        setUserData(null)
        // 홈페이지로 리다이렉트 (선택사항)
        navigate("/")
      } catch (error) {
        console.error("로그아웃 오류:", error)
        alert("로그아웃 중 오류가 발생했습니다.")
      }
    } else {
      // 로그인 페이지로 이동
      navigate("/login")
    }
  }

  const toggleSidebar = () => {
    // 스크롤바 너비를 계산하여 보정
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    if (!sidebarOpen) {
      // 사이드바 열기 전에 스크롤바 너비만큼 패딩 추가
      document.body.style.paddingRight = `${scrollbarWidth}px`
      document.body.style.overflow = "hidden"
    } else {
      // 사이드바 닫을 때 원래대로 복원
      document.body.style.paddingRight = "0"
      document.body.style.overflow = ""
    }

    setSidebarOpen(!sidebarOpen)
  }

  return (
    <>
      <header className="header">
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
                  <Link to="/virtual-fitting">가상피팅</Link>
                </li>
                <li className="nav-item">
                  <Link to="/custom">커스텀</Link>
                </li>
                <li className="nav-item">
                  <Link to="/feed">피드</Link>
                </li>

                {userLoggedIn && (
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

                {userLoggedIn ? (
                  <li className="user-profile-container">
                    <div className="user-profile">
                      <div className="profile-image">
                        {userData?.profile_picture ? (
                          <img src={userData.profile_picture || "/placeholder.svg"} alt="프로필" />
                        ) : (
                          <div className="profile-initial">{userData?.nickname?.charAt(0) || "U"}</div>
                        )}
                      </div>
                      <span className="user-name">{userData?.nickname || "사용자"}</span>
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

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isLoggedIn={userLoggedIn} userData={userData} />
    </>
  )
}

export default Header

"use client"

import { useState, useContext } from "react"
import { Link } from "react-router-dom"
import "../styles/Header.css"
import { ThemeContext } from "../context/ThemeContext"
import Sidebar from "./Sidebar"

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { darkMode, toggleTheme } = useContext(ThemeContext)

  const handleSearch = (e) => {
    e.preventDefault()
    console.log("검색어:", searchQuery)
    // 검색 기능 구현
  }

  const toggleLogin = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    // 사이드바 열릴 때 스크롤 방지
    document.body.style.overflow = !sidebarOpen ? "hidden" : ""
  }

  return (
    <>
      <header className="header">
        <div className="header-container">
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

          <nav className="navigation">
            <ul>
              <li className="nav-item">
                <Link to="/tops">상의</Link>
              </li>
              <li className="nav-item">
                <Link to="/bottoms">하의</Link>
              </li>
              <li className="nav-item">
                <Link to="/outer">아우터</Link>
              </li>
              <li className="nav-item">
                <Link to="/virtual-fitting">가상피팅</Link>
              </li>
              <li className="nav-item">
                <Link to="/kids">커스텀</Link>
              </li>
              <li className="nav-item">
                <Link to="/feed">피드</Link>
              </li>
              <li className="nav-item">
                <Link to="/mypage">마이페이지</Link>
              </li>
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
              <li>
                <button className="login-button" onClick={toggleLogin}>
                  {isLoggedIn ? "로그아웃" : "로그인"}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
    </>
  )
}

export default Header

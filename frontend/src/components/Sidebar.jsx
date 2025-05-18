"use client"

import { useContext } from "react"
import { Link } from "react-router-dom"
import { ThemeContext } from "../context/ThemeContext"
import "../styles/Sidebar.css"

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { darkMode, toggleTheme } = useContext(ThemeContext)

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={toggleSidebar}></div>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">FASHION GUYS</div>
          <button className="close-button" onClick={toggleSidebar} aria-label="사이드바 닫기">
            &times;
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link to="/tops" onClick={toggleSidebar}>
                상의
              </Link>
            </li>
            <li>
              <Link to="/bottoms" onClick={toggleSidebar}>
                하의
              </Link>
            </li>
            <li>
              <Link to="/outer" onClick={toggleSidebar}>
                아우터
              </Link>
            </li>
            <li>
              <Link to="/virtual-fitting" onClick={toggleSidebar}>
                가상피팅
              </Link>
            </li>
            <li>
              <Link to="/kids" onClick={toggleSidebar}>
                커스텀
              </Link>
            </li>
            <li>
              <Link to="/feed" onClick={toggleSidebar}>
                피드
              </Link>
            </li>
            <li>
              <Link to="/mypage" onClick={toggleSidebar}>
                마이페이지
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="theme-toggle-container">
            <span>다크 모드</span>
            <button className="theme-toggle-sidebar" onClick={toggleTheme} aria-label="테마 전환">
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
          </div>
          <button className="sidebar-login-button" onClick={toggleSidebar}>
            로그인
          </button>
        </div>
      </div>
    </>
  )
}

export default Sidebar

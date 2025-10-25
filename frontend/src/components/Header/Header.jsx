"use client";

import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./Header.module.css";
import { ThemeContext } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { getProfileImageUrl, handleImageError } from "../../utils/imageUtils";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- (useEffect, handleSearch, handleLoginLogout, toggleMobileMenu, handleMobileLinkClick 함수들은 이전과 동일하게 유지) ---
  // 스크롤 감지 효과
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 헤더가 있는 페이지임을 body에 표시
  useEffect(() => {
    document.body.classList.add("has-header");
    return () => {
      document.body.classList.remove("has-header");
    };
  }, []);

  // URL에서 검색어 파라미터 가져오기
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery("");
    }
  }, [location.search]);

  // 검색 처리
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (location.pathname === "/clothing-browse") {
      const params = new URLSearchParams(location.search);
      params.set("search", searchQuery);
      params.set("page", "1");
      navigate(`/clothing-browse?${params.toString()}`);
    } else {
      navigate(
        `/clothing-browse?search=${encodeURIComponent(searchQuery)}&page=1`
      );
    }
  };

  // 로그인/로그아웃 처리
  const handleLoginLogout = async () => {
    if (isAuthenticated) {
      try {
        await logout();
        window.location.reload();
      } catch (error) {
        console.error("로그아웃 오류:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    } else {
      navigate("/login");
    }
  };

  // 모바일 메뉴 토글 함수
  const toggleMobileMenu = () => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const isOpen = !mobileMenuOpen;
    if (isOpen) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.paddingRight = "0";
      document.body.style.overflow = "";
    }
    setMobileMenuOpen(isOpen);
  };

  // 모바일 메뉴 링크 클릭 시 메뉴 닫기
  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
    document.body.style.paddingRight = "0";
    document.body.style.overflow = "";
  };

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    if (mobileMenuOpen) {
      handleMobileLinkClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <header
        className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}
      >
        <div className={styles.headerContainer}>
          {/* 왼쪽 영역: 햄버거 버튼 + 로고 */}
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <button
                className={`${styles.hamburgerButton} ${
                  mobileMenuOpen ? styles.active : ""
                }`}
                onClick={toggleMobileMenu}
                aria-label="메뉴 열기/닫기"
                aria-expanded={mobileMenuOpen}
              >
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
              </button>
              <div className={styles.logo}>
                <Link to="/">FASHION GUYS</Link>
              </div>
            </div>
          </div>

          {/* 가운데 영역: 검색창 */}
          <div className={styles.searchBarContainer}>
            <div className={styles.searchBar}>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="브랜드, 상품 검색"
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
          <div className={styles.headerRight}>
            <nav className={styles.navigation}>
              <ul>
                {/* Desktop Nav Items */}
                <li className={styles.navItem}>
                  <Link to="/clothing-browse">의류</Link>
                </li>
                <li className={styles.navItem}>
                  <Link to="/virtual-fitting-main">가상피팅</Link>
                </li>
                <li className={styles.navItem}>
                  <Link to="/clothing-customizer">커스텀</Link>
                </li>
                <li className={styles.navItem}>
                  <Link to="/feed">피드</Link>
                </li>
                {isAuthenticated && (
                  <li className={styles.navItem}>
                    <Link to="/mypage">마이페이지</Link>
                  </li>
                )}

                {/* Always visible items */}
                <li>
                  <button
                    className={styles.themeToggle}
                    onClick={toggleTheme}
                    aria-label="테마 전환"
                  >
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
                        <line
                          x1="18.36"
                          y1="18.36"
                          x2="19.78"
                          y2="19.78"
                        ></line>
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
                  <li className={styles.userProfileContainer}>
                    <div className={styles.userProfile}>
                      <div className={styles.profileImage}>
                        {user?.profile_picture ? (
                          <img
                            src={
                              getProfileImageUrl(user.profile_picture) ||
                              "/placeholder.svg"
                            }
                            alt="프로필"
                            onError={(e) =>
                              handleImageError(
                                e,
                                "/placeholder.svg?height=32&width=32"
                              )
                            }
                          />
                        ) : (
                          <div className={styles.profileInitial}>
                            {user?.nickname?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                      <span className={styles.userName}>
                        {user?.nickname || "사용자"}
                      </span>
                      <button
                        className={styles.logoutButton}
                        onClick={handleLoginLogout}
                      >
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
                        <span className={styles.logoutButtonText}>
                          로그아웃
                        </span>
                      </button>
                    </div>
                  </li>
                ) : (
                  <li className={styles.authButtons}>
                    <button
                      className={styles.headerLoginButton}
                      onClick={handleLoginLogout}
                    >
                      로그인
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      <div
        className={`${styles.mobileNavOverlay} ${
          mobileMenuOpen ? styles.active : ""
        }`}
        onClick={toggleMobileMenu}
        aria-hidden={!mobileMenuOpen}
      ></div>

      {/* 모바일 메뉴 */}
      <nav
        className={`${styles.mobileNavMenu} ${
          mobileMenuOpen ? styles.open : ""
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className={styles.mobileMenuHeader}>
          <div className={styles.mobileLogo}>FASHION GUYS</div>
          <button
            className={styles.mobileCloseButton}
            onClick={toggleMobileMenu}
            aria-label="메뉴 닫기"
          >
            &times;
          </button>
        </div>
        <ul>
          <li>
            <Link to="/clothing-browse" onClick={handleMobileLinkClick}>
              의류
            </Link>
          </li>
          <li>
            <Link to="/virtual-fitting-main" onClick={handleMobileLinkClick}>
              가상피팅
            </Link>
          </li>
          <li>
            <Link to="/clothing-customizer" onClick={handleMobileLinkClick}>
              커스텀
            </Link>
          </li>
          <li>
            <Link to="/feed" onClick={handleMobileLinkClick}>
              피드
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link to="/mypage" onClick={handleMobileLinkClick}>
                마이페이지
              </Link>
            </li>
          )}
        </ul>
        {/* --- mobileMenuFooter 제거됨 --- */}
      </nav>
    </>
  );
};

export default Header;

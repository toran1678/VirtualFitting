"use client";

import { useState, useEffect } from "react";
import styles from "./ScrollToTopButton.module.css";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // 스크롤 이벤트 핸들러
  const toggleVisibility = () => {
    // 300px 이상 스크롤되면 버튼 표시
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // 맨 위로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // 부드럽게 스크롤
    });
  };

  useEffect(() => {
    // 스크롤 이벤트 리스너 등록
    window.addEventListener("scroll", toggleVisibility);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <button
      type="button"
      className={`${styles.scrollToTopButton} ${isVisible ? styles.show : ""}`}
      onClick={scrollToTop}
      aria-label="맨 위로 스크롤"
      title="맨 위로 스크롤"
    >
      {/* 화살표 아이콘 (SVG) */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;

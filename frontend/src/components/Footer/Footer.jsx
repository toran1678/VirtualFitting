"use client";

import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>FASHION GUYS</h3>
          <p className={styles.footerDescription}>
            가상 피팅 서비스로 구매 전 옷을 가상으로 입어볼 수 있습니다. AI
            기술을 활용한 온라인 쇼핑의 미래를 경험해보세요.
          </p>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerHeading}>바로가기</h4>
          <ul className={styles.footerLinks}>
            <li>
              <Link to="/">홈</Link>
            </li>
            <li>
              <Link to="/virtual-fitting">가상 피팅</Link>
            </li>
            <li>
              <Link to="/feed">패션 피드</Link>
            </li>
            <li>
              <Link to="/mypage">마이페이지</Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerHeading}>소개</h4>
          <ul className={styles.footerLinks}>
            <li>
              <Link to="/about">회사 소개</Link>
            </li>
            <li>
              <Link to="/how-it-works">이용 방법</Link>
            </li>
            <li>
              <Link to="/privacy">개인정보처리방침</Link>
            </li>
            <li>
              <Link to="/terms">이용약관</Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerHeading}>고객센터</h4>
          <address className={styles.footerContact}>
            <p>이메일: toran16784@gmail.com</p>
            <p>전화: 010-1234-1234</p>
            <div className={styles.socialLinks}>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className={styles.socialIcon}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialIcon}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={styles.socialIcon}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </div>
          </address>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} Fashion Guys. All rights reserved.
        </p>
        <p className={styles.techStack}>React & FastAPI 기반</p>
      </div>
    </footer>
  );
};

export default Footer;

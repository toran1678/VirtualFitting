"use client"

import { useState } from "react"
import Header from "../components/Header"
import Footer from "../components/Footer"
import ImagePlaceholder from "../components/ImagePlaceholder"
import "../styles/MainPage.css"

const MainPage = () => {
  const [activeCategory, setActiveCategory] = useState("인기순")

  const products = [
    {
      id: 1,
      name: "MOUVEMENT W QUILTING JACKET navy",
      price: 199000,
      image: "/images/product1.jpg",
    },
    {
      id: 2,
      name: "레터링 아트 오버핏 카디건(블랙)",
      price: 178000,
      image: "/images/product2.jpg",
    },
    {
      id: 3,
      name: "AUTHENTIC COMFORT HOOD ZIP SWEAT_NAVY",
      price: 94000,
      image: "/images/product3.jpg",
    },
    {
      id: 4,
      name: "빅지 레더 오버핏 블루종 [블랙]",
      price: 66000,
      image: null, // 이미지 없음 테스트
    },
    {
      id: 5,
      name: "피그먼트 주차 작업 베이지 SJOT1479",
      price: 154500,
      image: null, // 이미지 없음 테스트
    },
    {
      id: 6,
      name: "ASI 2WAY 어센틱 후드 윈드브레이커 자켓_블랙",
      price: 85900,
      image: "/images/product6.jpg",
    },
  ]

  return (
    <div className="main-page">
      <Header />

      <div className="main-content">
        <div className="content-container">
          <div className="category-tabs">
            <button className={activeCategory === "인기순" ? "active" : ""} onClick={() => setActiveCategory("인기순")}>
              인기순
            </button>
            <button className={activeCategory === "최신순" ? "active" : ""} onClick={() => setActiveCategory("최신순")}>
              최신순
            </button>
            <button
              className={activeCategory === "낮은 가격순" ? "active" : ""}
              onClick={() => setActiveCategory("낮은 가격순")}
            >
              낮은 가격순
            </button>
            <button
              className={activeCategory === "높은 가격순" ? "active" : ""}
              onClick={() => setActiveCategory("높은 가격순")}
            >
              높은 가격순
            </button>
          </div>

          <div className="main-layout">
            <div className="products-section">
              <div className="product-grid">
                {products.map((product) => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">
                      {product.image ? (
                        <img src={product.image || "/placeholder.svg"} alt={product.name} className="product-img" />
                      ) : (
                        <ImagePlaceholder productName={product.name} />
                      )}
                      <button className="try-on-button">가상 피팅</button>
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.price.toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="login-section">
              <div className="login-card">
                <h3>로그인</h3>
                <form className="login-form">
                  <input type="text" placeholder="아이디" className="login-input" />
                  <input type="password" placeholder="비밀번호" className="login-input" />
                  <button type="submit" className="login-submit-btn">
                    로그인
                  </button>
                  <button type="button" className="kakao-login-btn">
                    카카오 로그인
                  </button>
                </form>
                <div className="login-links">
                  <a href="#">아이디 찾기</a>
                  <span className="divider">|</span>
                  <a href="#">비밀번호 찾기</a>
                  <span className="divider">|</span>
                  <a href="#">회원가입</a>
                </div>
              </div>

              <div className="recent-products">
                <h3>최근 상품</h3>
                <p className="empty-recent">로그인 후 이용 가능합니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default MainPage

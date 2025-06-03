"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"
import ImagePlaceholder from "../components/ImagePlaceholder"
import { isLoggedIn, getCurrentUser } from "../api/auth"
import { getPopularItems, getLatestItems } from "../api/clothing_items"
import "../styles/MainPage.css"

const MainPage = () => {
  const [activeFilter, setActiveFilter] = useState("인기순")
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [userData, setUserData] = useState(null)
  const [recentProducts, setRecentProducts] = useState([])
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()

  // 상품 데이터 로드 함수
  const loadProducts = async (filter) => {
    setProductsLoading(true)
    setProductsError("")

    try {
      let data = []

      switch (filter) {
        case "인기순":
          data = await getPopularItems(6)
          break
        case "최신순":
          data = await getLatestItems(6)
          break
        default:
          data = await getPopularItems(6)
      }

      // 데이터 형식 변환
      const formattedProducts = data.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        image: item.product_image_url,
        brand: item.brand_name,
        likes: item.likes,
        gender: item.gender,
        category: item.main_category,
        subCategory: item.sub_category,
        productUrl: item.product_url,
      }))

      setProducts(formattedProducts)
    } catch (error) {
      console.error("상품 로드 실패:", error)
      setProductsError("상품을 불러오는데 실패했습니다.")
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    const checkLoginStatus = () => {
      const loginStatus = isLoggedIn()
      setUserLoggedIn(loginStatus)

      if (loginStatus) {
        setUserData(getCurrentUser())
        const storedRecentProducts = localStorage.getItem("recentProducts")
        if (storedRecentProducts) {
          try {
            setRecentProducts(JSON.parse(storedRecentProducts))
          } catch (e) {
            console.error("최근 본 상품 파싱 오류:", e)
            setRecentProducts([])
          }
        }
      } else {
        setUserData(null)
        setRecentProducts([])
      }
    }

    checkLoginStatus()
    loadProducts(activeFilter)

    const handleStorageChange = () => {
      checkLoginStatus()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // 필터 변경 시 상품 다시 로드
  useEffect(() => {
    loadProducts(activeFilter)
  }, [activeFilter])

  // 상품 클릭 핸들러
  const handleProductClick = (product) => {
    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      return
    }

    const updatedRecentProducts = [product, ...recentProducts.filter((item) => item.id !== product.id)].slice(0, 3)
    setRecentProducts(updatedRecentProducts)
    localStorage.setItem("recentProducts", JSON.stringify(updatedRecentProducts))
  }

  // 좋아요 토글 핸들러
  const handleLikeToggle = (e, productId) => {
    e.stopPropagation()
    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      return
    }
    // 좋아요 API 호출 로직 추가 예정
    console.log("좋아요 토글:", productId)
  }

  return (
    <div className="main-page">
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              AI 가상 피팅으로 <br />
              완벽한 스타일을 찾아보세요
            </h1>
            <p>최신 AI 기술로 옷을 입어보고, 나만의 스타일을 발견하세요</p>
            <div className="hero-buttons">
              <button className="cta-button primary" onClick={() => navigate("/virtual-fitting")}>
                가상 피팅 시작하기
              </button>
              <button className="cta-button secondary" onClick={() => navigate("/about")}>
                서비스 소개
              </button>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-placeholder">
              <div className="floating-card">
                <img src="/placeholder.svg?height=200&width=150" alt="Fashion" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">의류 상품</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">5,000+</div>
              <div className="stat-label">만족한 고객</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <div className="stat-label">정확도</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">서비스 지원</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          <div className="content-layout">
            {/* Products Section */}
            <section className="products-section">
              <div className="section-header">
                <h2>추천 상품</h2>
                <div className="filter-tabs">
                  <button
                    className={activeFilter === "인기순" ? "active" : ""}
                    onClick={() => setActiveFilter("인기순")}
                  >
                    <span className="filter-icon">🔥</span>
                    인기순
                  </button>
                  <button
                    className={activeFilter === "최신순" ? "active" : ""}
                    onClick={() => setActiveFilter("최신순")}
                  >
                    <span className="filter-icon">✨</span>
                    최신순
                  </button>
                </div>
              </div>

              {productsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>상품을 불러오는 중...</p>
                </div>
              ) : productsError ? (
                <div className="error-container">
                  <div className="error-icon">⚠️</div>
                  <p>{productsError}</p>
                  <button className="retry-button" onClick={() => loadProducts(activeFilter)}>
                    다시 시도
                  </button>
                </div>
              ) : (
                <div className="product-grid">
                  {products.map((product) => (
                    <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                      <div className="product-image">
                        {product.image ? (
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="product-img"
                            onError={(e) => {
                              e.target.style.display = "none"
                              e.target.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div style={{ display: product.image ? "none" : "flex" }} className="image-placeholder">
                          <ImagePlaceholder productName={product.name} />
                        </div>

                        <div className="product-overlay">
                          <button className="try-on-button">
                            <span className="button-icon">👗</span>
                            가상 피팅
                          </button>
                          <button className="like-button" onClick={(e) => handleLikeToggle(e, product.id)}>
                            <span className="heart-icon">🤍</span>
                          </button>
                        </div>

                        <div className="product-badge">{product.category}</div>
                      </div>

                      <div className="product-info">
                        <div className="product-brand">{product.brand}</div>
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-meta">
                          <span className="likes-count">
                            <span className="likes-icon">❤️</span>
                            {product.likes.toLocaleString()}
                          </span>
                          <span className="gender-tag">{product.gender}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="sidebar">
              {/* Search Section */}
              <div className="search-section">
                <h3>상품 검색</h3>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="브랜드, 상품명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button className="search-button">
                    <span className="search-icon">🔍</span>
                  </button>
                </div>
              </div>

              {/* Categories Section */}
              <div className="categories-section">
                <h3>카테고리</h3>
                <div className="category-list">
                  <button className="category-item">
                    <span className="category-icon">👔</span>
                    상의
                  </button>
                  <button className="category-item">
                    <span className="category-icon">👖</span>
                    하의
                  </button>
                  <button className="category-item">
                    <span className="category-icon">👗</span>
                    원피스
                  </button>
                  <button className="category-item">
                    <span className="category-icon">🧥</span>
                    아우터
                  </button>
                  <button className="category-item">
                    <span className="category-icon">👟</span>
                    신발
                  </button>
                  <button className="category-item">
                    <span className="category-icon">👜</span>
                    가방
                  </button>
                </div>
              </div>

              {/* Recent Products Section */}
              {userLoggedIn && (
                <div className="recent-products-section">
                  <h3>좋아요 한 상품</h3>
                  {recentProducts.length > 0 ? (
                    <div className="recent-products-list">
                      {recentProducts.map((product) => (
                        <div key={product.id} className="recent-product-item">
                          <div className="recent-product-image">
                            {product.image ? (
                              <img src={product.image || "/placeholder.svg"} alt={product.name} />
                            ) : (
                              <div className="recent-product-placeholder">{product.name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="recent-product-info">
                            <div className="recent-product-name">{product.name}</div>
                            <div className="recent-product-brand">{product.brand}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-recent">
                      <div className="empty-icon">💝</div>
                      <p>좋아요한 상품이 없습니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* Trending Brands */}
              <div className="trending-section">
                <h3>인기 브랜드</h3>
                <div className="trending-brands">
                  <div className="brand-tag">나이키</div>
                  <div className="brand-tag">아디다스</div>
                  <div className="brand-tag">유니클로</div>
                  <div className="brand-tag">자라</div>
                  <div className="brand-tag">H&M</div>
                  <div className="brand-tag">무신사</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default MainPage

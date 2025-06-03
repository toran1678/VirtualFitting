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
  // 상태 추가
  const [likedProducts, setLikedProducts] = useState([])
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()

  // 로컬 스토리지에서 좋아요한 상품 ID 목록 가져오기
  const getLikedProductIds = () => {
    try {
      const liked = localStorage.getItem("likedProducts")
      return liked ? JSON.parse(liked) : []
    } catch (error) {
      console.error("좋아요 목록 파싱 오류:", error)
      return []
    }
  }

  // 로컬 스토리지에 좋아요한 상품 ID 저장
  const saveLikedProductIds = (likedIds) => {
    try {
      localStorage.setItem("likedProducts", JSON.stringify(likedIds))
    } catch (error) {
      console.error("좋아요 목록 저장 오류:", error)
    }
  }

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

  // 좋아요한 상품 로드 함수
  const loadLikedProducts = () => {
    if (!userLoggedIn) {
      setLikedProducts([])
      return
    }

    const likedIds = getLikedProductIds()
    const likedProductsFromCurrent = products.filter((product) => likedIds.includes(product.id))
    setLikedProducts(likedProductsFromCurrent.slice(0, 3))
  }

  // 상품이 좋아요 되었는지 확인
  const isProductLiked = (productId) => {
    const likedIds = getLikedProductIds()
    return likedIds.includes(productId)
  }

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    const checkLoginStatus = () => {
      const loginStatus = isLoggedIn()
      setUserLoggedIn(loginStatus)

      if (loginStatus) {
        const user = getCurrentUser()
        setUserData(user)
      } else {
        setUserData(null)
        setLikedProducts([])
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
  }, [activeFilter])

  // 상품이 로드된 후 좋아요한 상품 로드
  useEffect(() => {
    if (userLoggedIn && products.length > 0) {
      loadLikedProducts()
    }
  }, [userLoggedIn, products])

  // 필터 변경 시 상품 다시 로드
  useEffect(() => {
    loadProducts(activeFilter)
  }, [activeFilter])

  // 상품 클릭 핸들러
  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`)
  }

  // 좋아요 토글 핸들러
  const handleLikeToggle = (e, productId) => {
    e.stopPropagation()
    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      return
    }

    const likedIds = getLikedProductIds()
    let updatedLikedIds

    if (likedIds.includes(productId)) {
      updatedLikedIds = likedIds.filter((id) => id !== productId)
    } else {
      updatedLikedIds = [...likedIds, productId]
    }

    saveLikedProductIds(updatedLikedIds)
    loadLikedProducts()
  }

  // 검색 핸들러
  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/clothing-browse?search=${encodeURIComponent(searchQuery)}&page=1`)
  }

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (category) => {
    navigate(`/clothing-browse?main_category=${encodeURIComponent(category)}&page=1`)
  }

  // 브랜드 클릭 핸들러
  const handleBrandClick = (brand) => {
    navigate(`/clothing-browse?brand=${encodeURIComponent(brand)}&page=1`)
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
                <img src="/placeholder.svg?height=400&width=300" alt="Fashion" />
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
                    <span className="filter-icon">★</span>
                    인기순
                  </button>
                  <button
                    className={activeFilter === "최신순" ? "active" : ""}
                    onClick={() => setActiveFilter("최신순")}
                  >
                    <span className="filter-icon">•</span>
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
                          <button
                            className="try-on-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/virtual-fitting/${product.id}`)
                            }}
                          >
                            <span className="button-icon">▶</span>
                            가상 피팅
                          </button>
                          <button className="like-button" onClick={(e) => handleLikeToggle(e, product.id)}>
                            <span className="heart-icon">{isProductLiked(product.id) ? "♥" : "♡"}</span>
                          </button>
                        </div>

                        <div className="product-badge">{product.category}</div>
                      </div>

                      <div className="product-info">
                        <div className="product-brand">{product.brand}</div>
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-meta">
                          <span className="likes-count">
                            <span className="likes-icon">♥</span>
                            {product.likes.toLocaleString()}
                          </span>
                          <span className="gender-tag">{product.gender}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="view-all-container">
                <button className="view-all-button" onClick={() => navigate("/clothing-browse")}>
                  모든 상품 보기
                  <span className="arrow-icon">→</span>
                </button>
              </div>
            </section>

            {/* Sidebar */}
            <aside className="sidebar">
              {/* Search Section */}
              <div className="search-section">
                <h3>상품 검색</h3>
                <form className="search-box" onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder="브랜드, 상품명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="search-button">
                    <span className="search-icon">⌕</span>
                  </button>
                </form>
              </div>

              {/* Categories Section */}
              <div className="categories-section">
                <h3>카테고리</h3>
                <div className="category-list">
                  <button className="category-item" onClick={() => handleCategoryClick("상의")}>
                    <span className="category-icon">■</span>
                    상의
                  </button>
                  <button className="category-item" onClick={() => handleCategoryClick("하의")}>
                    <span className="category-icon">■</span>
                    하의
                  </button>
                  <button className="category-item" onClick={() => handleCategoryClick("원피스")}>
                    <span className="category-icon">■</span>
                    원피스
                  </button>
                  <button className="category-item" onClick={() => handleCategoryClick("아우터")}>
                    <span className="category-icon">■</span>
                    아우터
                  </button>
                  <button className="category-item" onClick={() => handleCategoryClick("신발")}>
                    <span className="category-icon">■</span>
                    신발
                  </button>
                  <button className="category-item" onClick={() => handleCategoryClick("가방")}>
                    <span className="category-icon">■</span>
                    가방
                  </button>
                </div>
              </div>

              {/* Liked Products Section */}
              {userLoggedIn && (
                <div className="liked-products-section">
                  <h3>좋아요 한 상품</h3>
                  {likedProducts.length > 0 ? (
                    <div className="liked-products-list">
                      {likedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="liked-product-item"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="liked-product-image">
                            {product.image ? (
                              <img src={product.image || "/placeholder.svg"} alt={product.name} />
                            ) : (
                              <div className="liked-product-placeholder">{product.name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="liked-product-info">
                            <div className="liked-product-name">{product.name}</div>
                            <div className="liked-product-brand">{product.brand}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-liked">
                      <div className="empty-icon">♡</div>
                      <p>좋아요한 상품이 없습니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* Trending Brands */}
              <div className="trending-section">
                <h3>인기 브랜드</h3>
                <div className="trending-brands">
                  <div className="brand-tag" onClick={() => handleBrandClick("나이키")}>
                    나이키
                  </div>
                  <div className="brand-tag" onClick={() => handleBrandClick("아디다스")}>
                    아디다스
                  </div>
                  <div className="brand-tag" onClick={() => handleBrandClick("유니클로")}>
                    유니클로
                  </div>
                  <div className="brand-tag" onClick={() => handleBrandClick("자라")}>
                    자라
                  </div>
                  <div className="brand-tag" onClick={() => handleBrandClick("H&M")}>
                    H&M
                  </div>
                  <div className="brand-tag" onClick={() => handleBrandClick("무신사")}>
                    무신사
                  </div>
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

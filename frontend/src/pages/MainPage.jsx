"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { isLoggedIn } from "../api/auth"
import { toggleClothingLike, getMyLikedClothingIds } from "../api/likedClothes"
import "../styles/MainPage.css"
import { getPopularItems, getLatestItems, getCategories, browseClothingItems } from "../api/clothing_items"
import { getMyLikedClothes } from "../api/likedClothes"
import ImagePlaceholder from "../components/ImagePlaceholder"

const MainPage = () => {
  const navigate = useNavigate()
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [likedClothingIds, setLikedClothingIds] = useState(new Set())
  const [likingInProgress, setLikingInProgress] = useState(new Set())
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [recommendFilter, setRecommendFilter] = useState("popular") // popular, latest

  // 상태 관리 추가
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [likedProducts, setLikedProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [likedProductsLoading, setLikedProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState("")

  // 카테고리 관련 상태 추가
  const [categories, setCategories] = useState({
    main_categories: [],
    sub_categories: [],
    genders: [],
    brands: [],
  })
  const [categoryProducts, setCategoryProducts] = useState([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState("")

  // 배너 데이터
  const bannerData = [
    {
      id: 1,
      title: "AI 가상 피팅으로 완벽한 핏을 찾아보세요",
      subtitle: "집에서 편리하게 옷을 입어보고 구매하세요",
      image: "/placeholder.svg?height=600&width=1200",
      buttonText: "가상 피팅 체험하기",
      buttonAction: () => navigate("/virtual-fitting"),
    },
    {
      id: 2,
      title: "2025 인기 카테고리",
      subtitle: "최근 가장 인기가 많은 카테고리를 확인하세요",
      image: "/placeholder.svg?height=600&width=1200",
      buttonText: "컬렉션 보기",
      buttonAction: () => navigate("/clothing-browse?sub_category=블루종%2FMA-1"),
    },
    {
      id: 3,
      title: "나만의 커스텀 의류 제작",
      subtitle: "개성 있는 디자인으로 특별한 옷을 만들어보세요",
      image: "/placeholder.svg?height=600&width=1200",
      buttonText: "커스텀 시작하기",
      buttonAction: () => navigate("/custom"),
    },
  ]

  // 추천 상품 데이터 로드 함수
  const loadRecommendedProducts = async (filter) => {
    setProductsLoading(true)
    setProductsError("")

    try {
      let data = []

      switch (filter) {
        case "popular":
          data = await getPopularItems(8)
          break
        case "latest":
          data = await getLatestItems(8)
          break
        default:
          data = await getPopularItems(8)
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

      setRecommendedProducts(formattedProducts)
    } catch (error) {
      console.error("추천 상품 로드 실패:", error)
      setProductsError("추천 상품을 불러오는데 실패했습니다.")
      setRecommendedProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  // 좋아요한 의류 데이터 로드 함수
  const loadLikedProducts = async () => {
    if (!userLoggedIn) {
      setLikedProducts([])
      return
    }

    setLikedProductsLoading(true)
    try {
      const data = await getMyLikedClothes(0, 4) // 4개만 가져오기

      // API 응답을 컴포넌트에서 사용할 형태로 변환
      const formattedData = data.map((item) => ({
        id: item.clothing_id,
        name: item.product_name,
        image: item.product_image_url,
        brand: item.brand_name,
        category: item.main_category,
        gender: item.gender,
        likes: item.likes || 0,
        likedDate: new Date(item.liked_at).toLocaleDateString("ko-KR"),
      }))

      setLikedProducts(formattedData)
    } catch (error) {
      console.error("좋아요한 의류 로드 실패:", error)
      setLikedProducts([])
    } finally {
      setLikedProductsLoading(false)
    }
  }

  // 카테고리 데이터 로드 함수
  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error("카테고리 로드 실패:", error)
    }
  }

  // 카테고리별 상품 데이터 로드 함수
  const loadCategoryProducts = async () => {
    setCategoryLoading(true)
    setCategoryError("")

    try {
      const mainCategories = categories.main_categories.slice(0, 3) // 상위 3개 카테고리만
      const categoryProductsData = []

      for (const category of mainCategories) {
        try {
          const data = await browseClothingItems({
            main_category: category,
            page: 1,
            size: 4, // 각 카테고리당 4개 상품
            sort_by: "likes",
            order: "desc",
          })

          const formattedProducts = data.items.map((item) => ({
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

          categoryProductsData.push({
            category: category,
            products: formattedProducts,
          })
        } catch (error) {
          console.error(`카테고리 ${category} 상품 로드 실패:`, error)
        }
      }

      setCategoryProducts(categoryProductsData)
    } catch (error) {
      console.error("카테고리별 상품 로드 실패:", error)
      setCategoryError("카테고리별 상품을 불러오는데 실패했습니다.")
      setCategoryProducts([])
    } finally {
      setCategoryLoading(false)
    }
  }

  // 사용자가 좋아요한 의류 ID 목록 로드
  const loadLikedClothingIds = useCallback(async () => {
    if (!userLoggedIn) {
      setLikedClothingIds(new Set())
      return
    }

    try {
      const likedIds = await getMyLikedClothingIds()
      setLikedClothingIds(new Set(likedIds))
    } catch (error) {
      console.error("좋아요한 의류 목록 로드 실패:", error)
    }
  }, [userLoggedIn])

  // 좋아요 토글 핸들러
  const handleLikeToggle = async (e, productId) => {
    e.stopPropagation()

    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      navigate("/login")
      return
    }

    if (likingInProgress.has(productId)) {
      return
    }

    try {
      setLikingInProgress((prev) => new Set([...prev, productId]))
      const result = await toggleClothingLike(productId)

      setLikedClothingIds((prev) => {
        const newSet = new Set(prev)
        if (result.is_liked) {
          newSet.add(productId)
        } else {
          newSet.delete(productId)
        }
        return newSet
      })
    } catch (error) {
      console.error("좋아요 처리 실패:", error)
      alert("좋아요 처리 중 오류가 발생했습니다.")
    } finally {
      setLikingInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  // 상품 클릭 핸들러
  const handleProductClick = (product) => {
    console.log("상품 클릭:", product)
    // navigate(`/product/${product.id}`)
  }

  // 가상 피팅 핸들러
  const handleTryOn = (e, product) => {
    e.stopPropagation()
    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      navigate("/login")
      return
    }
    console.log("가상 피팅:", product)
    // navigate(`/virtual-fitting/try/${product.id}`)
  }

  // 배너 자동 슬라이드
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerData.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [bannerData.length])

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    const loggedIn = isLoggedIn()
    setUserLoggedIn(loggedIn)
    loadRecommendedProducts(recommendFilter)
    loadCategories() // 카테고리 로드 추가
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 카테고리 로드 후 카테고리별 상품 로드
  useEffect(() => {
    if (categories.main_categories.length > 0) {
      loadCategoryProducts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories])

  // 로그인 상태 변경 시 좋아요 목록 로드
  useEffect(() => {
    loadLikedClothingIds()
    loadLikedProducts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoggedIn])

  // 필터 변경 시 추천 상품 다시 로드
  useEffect(() => {
    loadRecommendedProducts(recommendFilter)
  }, [recommendFilter])

  return (
    <div className="main-page">
      <Header />

      <main className="main-content">
        {/* 히어로 배너 섹션 */}
        <section className="hero-banner">
          <div className="banner-container">
            {bannerData.map((banner, index) => (
              <div key={banner.id} className={`banner-slide ${index === currentBannerIndex ? "active" : ""}`}>
                <div className="banner-background">
                  <div className="banner-overlay"></div>
                </div>
                <div className="banner-content">
                  <h1 className="banner-title">{banner.title}</h1>
                  <p className="banner-subtitle">{banner.subtitle}</p>
                  <button className="banner-button" onClick={banner.buttonAction}>
                    {banner.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 배너 인디케이터 */}
          <div className="banner-indicators">
            {bannerData.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentBannerIndex ? "active" : ""}`}
                onClick={() => setCurrentBannerIndex(index)}
              />
            ))}
          </div>
        </section>

        {/* 추천 상품 섹션 */}
        <section className="recommended-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">추천 상품</h2>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${recommendFilter === "popular" ? "active" : ""}`}
                  onClick={() => setRecommendFilter("popular")}
                >
                  인기순
                </button>
                <button
                  className={`filter-btn ${recommendFilter === "latest" ? "active" : ""}`}
                  onClick={() => setRecommendFilter("latest")}
                >
                  최신순
                </button>
              </div>
            </div>

            <div className="products-grid">
              {productsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>상품을 불러오는 중...</p>
                </div>
              ) : productsError ? (
                <div className="error-container">
                  <div className="error-icon">⚠️</div>
                  <p>{productsError}</p>
                  <button className="retry-button" onClick={() => loadRecommendedProducts(recommendFilter)}>
                    다시 시도
                  </button>
                </div>
              ) : (
                recommendedProducts.map((product) => (
                  <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                    <div className="product-image">
                      {product.image ? (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
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
                        <button className="try-on-button" onClick={(e) => handleTryOn(e, product)}>
                          가상 피팅
                        </button>
                        <button
                          className={`like-button ${likedClothingIds.has(product.id) ? "liked" : ""}`}
                          onClick={(e) => handleLikeToggle(e, product.id)}
                          disabled={likingInProgress.has(product.id)}
                        >
                          <span className="heart-icon">
                            {likingInProgress.has(product.id) ? "⏳" : likedClothingIds.has(product.id) ? "❤️" : "🤍"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="product-info">
                      <div className="product-brand">{product.brand}</div>
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-meta">
                        <span className="product-category">{product.category}</span>
                        <span className="likes-count">
                          <span className="likes-icon">❤️</span>
                          {product.likes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-footer">
              <button className="view-all-button" onClick={() => navigate("/clothing-browse")}>
                모든 상품 보기
              </button>
            </div>
          </div>
        </section>

        {/* 카테고리별 상품 섹션 */}
        <section className="category-section">
          <div className="container">
            <h2 className="section-title">카테고리별 상품</h2>

            {categoryLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>카테고리별 상품을 불러오는 중...</p>
              </div>
            ) : categoryError ? (
              <div className="error-container">
                <div className="error-icon">⚠️</div>
                <p>{categoryError}</p>
                <button className="retry-button" onClick={loadCategoryProducts}>
                  다시 시도
                </button>
              </div>
            ) : (
              categoryProducts.map((category) => (
                <div key={category.category} className="category-group">
                  <div className="category-header">
                    <h3 className="category-title">{category.category}</h3>
                    <button
                      className="category-more-btn"
                      onClick={() => navigate(`/clothing-browse?main_category=${category.category}`)}
                    >
                      더보기 →
                    </button>
                  </div>

                  <div className="category-products">
                    {category.products.map((product) => (
                      <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                        <div className="product-image">
                          {product.image ? (
                            <img
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
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
                            <button className="try-on-button" onClick={(e) => handleTryOn(e, product)}>
                              가상 피팅
                            </button>
                            <button
                              className={`like-button ${likedClothingIds.has(product.id) ? "liked" : ""}`}
                              onClick={(e) => handleLikeToggle(e, product.id)}
                              disabled={likingInProgress.has(product.id)}
                            >
                              <span className="heart-icon">
                                {likingInProgress.has(product.id)
                                  ? "⏳"
                                  : likedClothingIds.has(product.id)
                                    ? "❤️"
                                    : "🤍"}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="product-info">
                          <div className="product-brand">{product.brand}</div>
                          <h3 className="product-name">{product.name}</h3>
                          <div className="product-meta">
                            <span className="product-category">{product.gender}</span>
                            <span className="likes-count">
                              <span className="likes-icon">❤️</span>
                              {product.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 좋아요한 의류 섹션 (로그인 시에만 표시) */}
        {userLoggedIn && (
          <section className="liked-section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">좋아요한 의류</h2>
                <button className="view-more-btn" onClick={() => navigate("/mypage?tab=like")}>
                  더보기 →
                </button>
              </div>

              <div className="liked-products">
                {likedProductsLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>좋아요한 의류를 불러오는 중...</p>
                  </div>
                ) : likedProducts.length === 0 ? (
                  <div className="empty-content">
                    <div className="empty-icon">💝</div>
                    <h3>좋아요한 의류가 없습니다</h3>
                    <p>마음에 드는 상품에 좋아요를 눌러보세요!</p>
                  </div>
                ) : (
                  likedProducts.map((product) => (
                    <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                      <div className="product-image">
                        <img src={product.image || "/placeholder.svg"} alt={product.name} />

                        <div className="product-overlay">
                          <button className="try-on-button" onClick={(e) => handleTryOn(e, product)}>
                            가상 피팅
                          </button>
                          <button
                            className={`like-button liked`}
                            onClick={(e) => handleLikeToggle(e, product.id)}
                            disabled={likingInProgress.has(product.id)}
                          >
                            <span className="heart-icon">{likingInProgress.has(product.id) ? "⏳" : "❤️"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="product-info">
                        <div className="product-brand">{product.brand}</div>
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-meta">
                          <span className="product-category">{product.category}</span>
                          <span className="likes-count">
                            <span className="likes-icon">❤️</span>
                            {product.likes.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default MainPage

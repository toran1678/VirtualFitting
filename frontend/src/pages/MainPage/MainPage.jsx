"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn } from "../../api/auth"
import { toggleClothingLike, getMyLikedClothingIds } from "../../api/likedClothes"
import styles from "./MainPage.module.css"
import { getPopularItems, getLatestItems, getCategories, browseClothingItems } from "../../api/clothing_items"
import { getMyLikedClothes } from "../../api/likedClothes"
// 이 줄을 제거
import { Heart, Clock, AlertTriangle, Gift } from "lucide-react"

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
      buttonAction: () => navigate("/clothing-customizer"),
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
        productUrl: item.product_url,
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

  // 이미지 에러 처리 함수
  const handleImageError = (e, title) => {
    e.target.style.display = "none"
    const placeholder = e.target.nextElementSibling
    if (placeholder) {
      placeholder.style.display = "flex"
      placeholder.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style="color: var(--text-secondary); opacity: 0.6;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <span style="font-size: 0.85rem; color: var(--text-secondary); text-align: center;">이미지가 없습니다</span>
        </div>
      `
    }
  }

  // 상품 클릭 핸들러
  const handleProductClick = (product) => {
    console.log("상품 클릭:", product)
    if (product.productUrl) {
      window.open(product.productUrl, "_blank", "noopener,noreferrer")
    } else {
      console.log("상품 URL이 없습니다:", product)
    }
  }

  // 가상 피팅 핸들러
  const handleTryOn = (e, product) => {
    e.stopPropagation()
    if (!userLoggedIn) {
      alert("로그인 후 이용 가능합니다.")
      navigate("/login")
      return
    }
    const q = new URLSearchParams({
      clothingId: String(product.id),
      clothingImage: product.image ? encodeURIComponent(product.image) : "",
      clothingCategory: product.category || "",
    }).toString()
    navigate(`/virtual-fitting?${q}`)
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
    <div className={styles.mainPage}>
      <Header />

      <main className={styles.mainContent}>
        {/* 히어로 배너 섹션 */}
        <section className={styles.heroBanner}>
          <div className={styles.bannerContainer}>
            {bannerData.map((banner, index) => (
              <div
                key={banner.id}
                className={`${styles.bannerSlide} ${index === currentBannerIndex ? styles.active : ""}`}
              >
                <div className={styles.bannerBackground}>
                  <div className={styles.bannerOverlay}></div>
                </div>
                <div className={styles.bannerContent}>
                  <h1 className={styles.bannerTitle}>{banner.title}</h1>
                  <p className={styles.bannerSubtitle}>{banner.subtitle}</p>
                  <button className={styles.bannerButton} onClick={banner.buttonAction}>
                    {banner.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 배너 인디케이터 */}
          <div className={styles.bannerIndicators}>
            {bannerData.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentBannerIndex ? styles.active : ""}`}
                onClick={() => setCurrentBannerIndex(index)}
              />
            ))}
          </div>
        </section>

        {/* 추천 상품 섹션 */}
        <section className={styles.recommendedSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>추천 상품</h2>
              <div className={styles.filterButtons}>
                <button
                  className={`${styles.filterBtn} ${recommendFilter === "popular" ? styles.active : ""}`}
                  onClick={() => setRecommendFilter("popular")}
                >
                  인기순
                </button>
                <button
                  className={`${styles.filterBtn} ${recommendFilter === "latest" ? styles.active : ""}`}
                  onClick={() => setRecommendFilter("latest")}
                >
                  최신순
                </button>
              </div>
            </div>

            <div className={styles.productsGrid}>
              {productsLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>상품을 불러오는 중...</p>
                </div>
              ) : productsError ? (
                <div className={styles.errorContainer}>
                  <div className={styles.errorIcon}>
                    <AlertTriangle size={48} />
                  </div>
                  <p>{productsError}</p>
                  <button className={styles.retryButton} onClick={() => loadRecommendedProducts(recommendFilter)}>
                    다시 시도
                  </button>
                </div>
              ) : (
                recommendedProducts.map((product) => (
                  <div key={product.id} className={styles.productCard} onClick={() => handleProductClick(product)}>
                    <div className={styles.productImage}>
                      {product.image ? (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          onError={(e) => handleImageError(e, product.name)}
                          style={{ display: "block" }}
                        />
                      ) : null}
                      <div style={{ display: product.image ? "none" : "flex" }} className={styles.imagePlaceholder}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                          <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21,15 16,10 5,21" />
                          </svg>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
                            이미지가 없습니다
                          </span>
                        </div>
                      </div>

                      <div className={styles.productOverlay}>
                        <button className={styles.tryOnButton} onClick={(e) => handleTryOn(e, product)}>
                          가상 피팅
                        </button>
                        <button
                          className={`${styles.likeButton} ${likedClothingIds.has(product.id) ? styles.liked : ""}`}
                          onClick={(e) => handleLikeToggle(e, product.id)}
                          disabled={likingInProgress.has(product.id)}
                        >
                          <span className={styles.heartIcon}>
                            {likingInProgress.has(product.id) ? (
                              <Clock size={16} />
                            ) : likedClothingIds.has(product.id) ? (
                              <Heart size={16} fill="currentColor" />
                            ) : (
                              <Heart size={16} />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.productInfo}>
                      <div className={styles.productBrand}>{product.brand}</div>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <div className={styles.productMeta}>
                        <span className={styles.productCategory}>{product.category}</span>
                        <span className={styles.likesCount}>
                          <Heart size={14} className={styles.likesIcon} />
                          {product.likes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.sectionFooter}>
              <button className={styles.viewAllButton} onClick={() => navigate("/clothing-browse")}>
                모든 상품 보기
              </button>
            </div>
          </div>
        </section>

        {/* 카테고리별 상품 섹션 */}
        <section className={styles.categorySection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>카테고리별 상품</h2>

            {categoryLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>카테고리별 상품을 불러오는 중...</p>
              </div>
            ) : categoryError ? (
              <div className={styles.errorContainer}>
                <div className={styles.errorIcon}>
                  <AlertTriangle size={48} />
                </div>
                <p>{categoryError}</p>
                <button className={styles.retryButton} onClick={loadCategoryProducts}>
                  다시 시도
                </button>
              </div>
            ) : (
              categoryProducts.map((category) => (
                <div key={category.category} className={styles.categoryGroup}>
                  <div className={styles.categoryHeader}>
                    <h3 className={styles.categoryTitle}>{category.category}</h3>
                    <button
                      className={styles.categoryMoreBtn}
                      onClick={() => navigate(`/clothing-browse?main_category=${category.category}`)}
                    >
                      더보기 →
                    </button>
                  </div>

                  <div className={styles.categoryProducts}>
                    {category.products.map((product) => (
                      <div key={product.id} className={styles.productCard} onClick={() => handleProductClick(product)}>
                        <div className={styles.productImage}>
                          {product.image ? (
                            <img
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              onError={(e) => handleImageError(e, product.name)}
                              style={{ display: "block" }}
                            />
                          ) : null}
                          <div style={{ display: product.image ? "none" : "flex" }} className={styles.imagePlaceholder}>
                            <div
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
                            >
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                              >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21,15 16,10 5,21" />
                              </svg>
                              <span
                                style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}
                              >
                                이미지가 없습니다
                              </span>
                            </div>
                          </div>

                          <div className={styles.productOverlay}>
                            <button className={styles.tryOnButton} onClick={(e) => handleTryOn(e, product)}>
                              가상 피팅
                            </button>
                            <button
                              className={`${styles.likeButton} ${likedClothingIds.has(product.id) ? styles.liked : ""}`}
                              onClick={(e) => handleLikeToggle(e, product.id)}
                              disabled={likingInProgress.has(product.id)}
                            >
                              <span className={styles.heartIcon}>
                                {likingInProgress.has(product.id) ? (
                                  <Clock size={16} />
                                ) : likedClothingIds.has(product.id) ? (
                                  <Heart size={16} fill="currentColor" />
                                ) : (
                                  <Heart size={16} />
                                )}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className={styles.productInfo}>
                          <div className={styles.productBrand}>{product.brand}</div>
                          <h3 className={styles.productName}>{product.name}</h3>
                          <div className={styles.productMeta}>
                            <span className={styles.productCategory}>{product.gender}</span>
                            <span className={styles.likesCount}>
                              <Heart size={14} className={styles.likesIcon} />
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
          <section className={styles.likedSection}>
            <div className={styles.container}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>좋아요한 의류</h2>
                <button className={styles.viewMoreBtn} onClick={() => navigate("/mypage?tab=like")}>
                  더보기 →
                </button>
              </div>

              <div className={styles.likedProducts}>
                {likedProductsLoading ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>좋아요한 의류를 불러오는 중...</p>
                  </div>
                ) : likedProducts.length === 0 ? (
                  <div className={styles.emptyContent}>
                    <div className={styles.emptyIcon}>
                      <Gift size={48} />
                    </div>
                    <h3>좋아요한 의류가 없습니다</h3>
                    <p>마음에 드는 상품에 좋아요를 눌러보세요!</p>
                  </div>
                ) : (
                  likedProducts.map((product) => (
                    <div key={product.id} className={styles.productCard} onClick={() => handleProductClick(product)}>
                      <div className={styles.productImage}>
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          onError={(e) => handleImageError(e, product.name)}
                          style={{ display: "block" }}
                        />
                        <div style={{ display: "none" }} className={styles.imagePlaceholder}>
                          <div
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
                          >
                            <svg
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21,15 16,10 5,21" />
                            </svg>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
                              이미지가 없습니다
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.productInfo}>
                        <div className={styles.productBrand}>{product.brand}</div>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <div className={styles.productMeta}>
                          <span className={styles.productCategory}>{product.category}</span>
                          <span className={styles.likesCount}>
                            <Heart size={14} className={styles.likesIcon} />
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

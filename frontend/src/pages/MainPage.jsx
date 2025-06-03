"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"
import ImagePlaceholder from "../components/ImagePlaceholder"
import { loginUser, isLoggedIn, getCurrentUser, logoutUser } from "../api/auth"
import { getPopularItems, getLatestItems } from "../api/clothing_items"
import { useKakaoAuth } from "../hooks/useKakaoAuth"
import "../styles/MainPage.css"
import { getProfileImageUrl, handleImageError } from "../utils/imageUtils"

const MainPage = () => {
  const [activeCategory, setActiveCategory] = useState("인기순")
  const [loginForm, setLoginForm] = useState({ id: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [userData, setUserData] = useState(null)
  const [recentProducts, setRecentProducts] = useState([])
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")
  const navigate = useNavigate()

  // 카카오 인증 관련 훅
  const { startKakaoLogin, isLoading: kakaoLoading, error: kakaoError } = useKakaoAuth()

  // 상품 데이터 로드 함수
  const loadProducts = async (category) => {
    setProductsLoading(true)
    setProductsError("")

    try {
      let data = []

      switch (category) {
        case "인기순":
          data = await getPopularItems(6)
          break
        case "최신순":
          data = await getLatestItems(6)
          break
        default:
          data = await getPopularItems(6)
      }

      // 데이터 형식을 기존 products 형식에 맞게 변환
      const formattedProducts = data.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: Math.floor(Math.random() * 200000) + 50000, // 임시 가격 (실제로는 가격 필드 추가 필요)
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
      // 에러 시 빈 배열로 설정
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 로그인 상태 확인 및 상품 로드
  useEffect(() => {
    const checkLoginStatus = () => {
      const loginStatus = isLoggedIn()
      setUserLoggedIn(loginStatus)

      if (loginStatus) {
        setUserData(getCurrentUser())
        // 최근 본 상품 가져오기 (로컬 스토리지에서)
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

    // 초기 로그인 상태 확인
    checkLoginStatus()

    // 초기 상품 로드
    loadProducts(activeCategory)

    // 로컬 스토리지 변경 이벤트 리스너 추가
    const handleStorageChange = () => {
      checkLoginStatus()
    }

    window.addEventListener("storage", handleStorageChange)

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // 카테고리 변경 시 상품 다시 로드
  useEffect(() => {
    loadProducts(activeCategory)
  }, [activeCategory])

  // 카카오 에러 처리
  useEffect(() => {
    if (kakaoError) {
      setLoginError(kakaoError)
    }
  }, [kakaoError])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setLoginForm({ ...loginForm, [name]: value })
    // 입력 시 에러 메시지 초기화
    if (loginError) setLoginError("")
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    // 입력 검증
    if (!loginForm.id.trim() || !loginForm.password.trim()) {
      setLoginError("아이디와 비밀번호를 모두 입력해주세요.")
      return
    }

    setLoading(true)
    setLoginError("")

    try {
      // 로그인 API 호출
      await loginUser(loginForm)

      // 로그인 성공 시 상태 업데이트
      setUserLoggedIn(true)
      setUserData(getCurrentUser())

      // 폼 초기화
      setLoginForm({ id: "", password: "" })

      // 페이지 새로고침
      window.location.reload()
    } catch (error) {
      console.error("로그인 오류:", error)

      // 서버 응답에 따른 에러 메시지 설정
      if (error.response) {
        if (error.response.status === 401) {
          setLoginError("아이디 또는 비밀번호가 일치하지 않습니다.")
        } else if (error.response.status === 404) {
          setLoginError("존재하지 않는 사용자입니다.")
        } else {
          setLoginError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
        }
      } else {
        setLoginError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.")
      }
    } finally {
      setLoading(false)
    }
  }

  // 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    try {
      setLoginError("")
      console.log("메인페이지에서 카카오 로그인 시작...")
      await startKakaoLogin()
    } catch (error) {
      console.error("카카오 로그인 오류:", error)
      setLoginError("카카오 로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      setUserLoggedIn(false)
      setUserData(null)
      setRecentProducts([])
      window.location.reload()
    } catch (error) {
      console.error("로그아웃 오류:", error)
      alert("로그아웃 중 오류가 발생했습니다.")
    }
  }

  // 상품 클릭 시 최근 본 상품에 추가
  const handleProductClick = (product) => {
    if (!userLoggedIn) return

    // 최근 본 상품 목록 업데이트
    const updatedRecentProducts = [product, ...recentProducts.filter((item) => item.id !== product.id)].slice(0, 3)

    setRecentProducts(updatedRecentProducts)

    // 로컬 스토리지에 저장
    localStorage.setItem("recentProducts", JSON.stringify(updatedRecentProducts))
  }

  return (
    <div className="main-page">
      <Header />

      <div className="main-content">
        <div className="content-container">
          <div className="category-tabs animated-scrollbar">
            <button className={activeCategory === "인기순" ? "active" : ""} onClick={() => setActiveCategory("인기순")}>
              인기순
            </button>
            <button className={activeCategory === "최신순" ? "active" : ""} onClick={() => setActiveCategory("최신순")}>
              최신순
            </button>
          </div>

          <div className="main-layout">
            <div className="products-section">
              {productsLoading ? (
                <div className="loading-container">
                  <p>상품을 불러오는 중...</p>
                </div>
              ) : productsError ? (
                <div className="error-container">
                  <p>{productsError}</p>
                  <button onClick={() => loadProducts(activeCategory)}>다시 시도</button>
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
                        <div style={{ display: product.image ? "none" : "flex" }}>
                          <ImagePlaceholder productName={product.name} />
                        </div>
                        <button className="try-on-button">가상 피팅</button>
                      </div>
                      <h3>{product.name}</h3>
                      <p>{product.price.toLocaleString()}원</p>
                      <div className="product-meta">
                        <span className="brand">{product.brand}</span>
                        <span className="likes">❤️ {product.likes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="login-section">
              {!userLoggedIn ? (
                <div className="login-card">
                  <h3>로그인</h3>
                  <form className="login-form" onSubmit={handleLogin}>
                    <input
                      type="text"
                      name="id"
                      placeholder="아이디"
                      className="login-input"
                      value={loginForm.id}
                      onChange={handleInputChange}
                    />
                    <input
                      type="password"
                      name="password"
                      placeholder="비밀번호"
                      className="login-input"
                      value={loginForm.password}
                      onChange={handleInputChange}
                    />
                    {loginError && <p className="login-error">{loginError}</p>}
                    <button type="submit" className="login-submit-btn" disabled={loading}>
                      {loading ? "로그인 중..." : "로그인"}
                    </button>
                    <button
                      type="button"
                      className="kakao-login-btn"
                      onClick={handleKakaoLogin}
                      disabled={kakaoLoading || loading}
                    >
                      {kakaoLoading ? "카카오 로그인 중..." : "카카오 로그인"}
                    </button>
                  </form>
                  <div className="login-links">
                    <a href="/">아이디 찾기</a>
                    <span className="divider">|</span>
                    <a href="/">비밀번호 찾기</a>
                    <span className="divider">|</span>
                    <a href="/register">회원가입</a>
                  </div>
                </div>
              ) : (
                <div className="user-profile-card">
                  <div className="user-profile-header">
                    <div className="profile-image-large">
                      {userData?.profile_picture ? (
                        <img
                          src={getProfileImageUrl(userData.profile_picture) || "/placeholder.svg"}
                          alt="프로필"
                          onError={(e) => handleImageError(e, "/placeholder.svg?height=60&width=60")}
                        />
                      ) : (
                        <div className="profile-initial-large">{userData?.nickname?.charAt(0) || "U"}</div>
                      )}
                    </div>
                    <div className="user-info">
                      <h3>{userData?.nickname || "사용자"}</h3>
                      <p>{userData?.email || ""}</p>
                    </div>
                  </div>
                  <div className="user-profile-actions">
                    <button className="mypage-button" onClick={() => navigate("/mypage")}>
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      마이페이지
                    </button>
                    <button className="logout-button-main" onClick={handleLogout}>
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
                      로그아웃
                    </button>
                  </div>
                </div>
              )}

              <div className="recent-products">
                <h3>좋아요 한 상품</h3>
                {userLoggedIn && recentProducts.length > 0 ? (
                  <div className="recent-products-grid">
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
                          <p className="recent-product-name">{product.name}</p>
                          <p className="recent-product-price">{product.price.toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-recent">
                    {userLoggedIn ? "좋아요한 상품이 없습니다." : "로그인 후 이용 가능합니다"}
                  </p>
                )}
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

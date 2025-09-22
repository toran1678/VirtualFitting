"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Camera, Upload, Search, Grid, List, Plus, X, Trash2, Eye } from "lucide-react"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import {
  uploadClothing,
  getUserClothes,
  getUserClothesStats,
  getClothing,
  deleteClothing,
  getClothingImageUrl,
  handleClothingImageError,
  validateClothingFile,
  compressClothingImage,
  VALID_CATEGORIES,
  VALID_SEASONS,
} from "../../api/userClothesAPI"
import styles from "./MyCloset.module.css"

const MyCloset = () => {
  const [, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clothes, setClothes] = useState([])
  const [filteredClothes, setFilteredClothes] = useState([])
  const [stats, setStats] = useState({ total_count: 0, category_counts: {}, recent_uploads: 0 })
  const [viewMode, setViewMode] = useState("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedColor, setSelectedColor] = useState("all")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedClothing, setSelectedClothing] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // 업로드 상태
  const [uploadForm, setUploadForm] = useState({
    category: "top",
    color: "black",
    season: "spring",
    style: "casual",
    name: "",
    brand: "",
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // 카테고리 옵션 (API에서 가져온 것 사용)
  const categories = [{ value: "all", label: "전체" }, ...VALID_CATEGORIES]

  // 계절 옵션 (API에서 가져온 것 사용)
  const seasons = [{ value: "all", label: "전체" }, ...VALID_SEASONS]

  // 색상 옵션
  const colors = [
    { value: "all", label: "전체" },
    { value: "black", label: "블랙" },
    { value: "white", label: "화이트" },
    { value: "gray", label: "그레이" },
    { value: "navy", label: "네이비" },
    { value: "blue", label: "블루" },
    { value: "red", label: "레드" },
    { value: "pink", label: "핑크" },
    { value: "green", label: "그린" },
    { value: "yellow", label: "옐로우" },
    { value: "brown", label: "브라운" },
    { value: "beige", label: "베이지" },
  ]

  // 스타일 옵션
  const stylesOptions = [
    { value: "casual", label: "캐주얼" },
    { value: "formal", label: "포멀" },
    { value: "sporty", label: "스포티" },
    { value: "vintage", label: "빈티지" },
    { value: "modern", label: "모던" },
    { value: "romantic", label: "로맨틱" },
  ]

  // 의류 데이터 로드
  const loadClothesData = useCallback(async (params = {}) => {
    try {
      setError(null)
      const response = await getUserClothes({
        page: params.page || pagination.page,
        perPage: params.perPage || pagination.perPage,
        category: params.category || (selectedCategory !== "all" ? selectedCategory : null),
        season: params.season || (selectedSeason !== "all" ? selectedSeason : null),
        search: params.search || searchTerm || null,
      })

      setClothes(response.clothes)
      setPagination({
        page: response.page,
        perPage: response.per_page,
        total: response.total,
        totalPages: response.total_pages,
      })
    } catch (error) {
      console.error("의류 데이터 로드 실패:", error)
      setError("의류 데이터를 불러오는데 실패했습니다.")
    }
  }, [pagination.page, pagination.perPage, selectedCategory, selectedSeason, searchTerm])

  // 초기 인증 및 데이터 로드
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      const user = getCurrentUser()
      setUserData(user)

      await loadClothesData()
      await loadStatsData()
      setLoading(false)
    }

    checkAuth()
  }, [navigate, loadClothesData])

  // 통계 데이터 로드
  const loadStatsData = async () => {
    try {
      const statsData = await getUserClothesStats()
      setStats(statsData)
    } catch (error) {
      console.error("통계 데이터 로드 실패:", error)
    }
  }

  // 필터링 효과 (백엔드에서 이미 필터링된 데이터를 받으므로 로컬 필터링은 검색어와 색상만)
  useEffect(() => {
    console.log("🔍 필터링 시작:", {
      clothesCount: clothes.length,
      searchTerm,
      selectedCategory,
      selectedSeason,
      selectedColor
    })

    const filtered = clothes.filter((item) => {
      console.log("🔍 아이템 체크:", {
        name: item.name,
        category: item.category,
        season: item.season,
        color: item.color,
        brand: item.brand
      })

      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))

      // 백엔드에서 이미 카테고리와 계절로 필터링했으므로 로컬에서는 색상만 필터링
      const matchesColor = selectedColor === "all" || item.color === selectedColor

      const result = matchesSearch && matchesColor
      console.log("🔍 필터 결과:", { matchesSearch, matchesColor, result })
      
      return result
    })

    console.log("🔍 최종 필터링 결과:", filtered.length, "개")
    setFilteredClothes(filtered)
  }, [clothes, searchTerm, selectedColor, selectedCategory, selectedSeason])

  // 필터 변경 시 데이터 다시 로드
  useEffect(() => {
    if (!loading) {
      loadClothesData({
        page: 1,
        category: selectedCategory,
        season: selectedSeason,
        search: searchTerm,
      })
    }
  }, [selectedCategory, selectedSeason, loadClothesData, loading, searchTerm])

  // 검색어 디바운싱
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        loadClothesData({
          page: 1,
          search: searchTerm,
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, loadClothesData, loading])

  // 파일 선택 핸들러
  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 파일 유효성 검사
    const validation = validateClothingFile(file)
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    try {
      // 이미지 압축
      const compressedFile = await compressClothingImage(file)
      setSelectedFile(compressedFile)
      setPreviewUrl(URL.createObjectURL(compressedFile))

      // 파일명으로 의류명 자동 설정
      if (!uploadForm.name) {
        setUploadForm((prev) => ({ ...prev, name: file.name.split(".")[0] }))
      }
    } catch (error) {
      console.error("파일 처리 실패:", error)
      alert("파일 처리 중 오류가 발생했습니다.")
    }
  }

  // 실제 업로드 핸들러
  const handleConfirmUpload = async () => {
    if (!selectedFile || !uploadForm.name.trim()) {
      alert("파일과 의류명을 입력해주세요.")
      return
    }

    setUploadLoading(true)

    try {
      const clothingData = {
        file: selectedFile,
        name: uploadForm.name.trim(),
        brand: uploadForm.brand.trim() || undefined,
        category: uploadForm.category,
        color: uploadForm.color,
        season: uploadForm.season,
        style: uploadForm.style,
      }

      const result = await uploadClothing(clothingData)

      if (result.success) {
        // 업로드 후 필터 초기화 및 전체 데이터 로드
        setSelectedCategory("all")
        setSelectedSeason("all")
        setSelectedColor("all")
        setSearchTerm("")
        
        // 모든 필터를 초기화한 상태로 데이터 로드
        await loadClothesData({ 
          page: 1,
          category: null,
          season: null,
          search: null
        })
        await loadStatsData() // 통계 업데이트
        
        // 약간의 지연 후 한 번 더 데이터 로드 (서버 반영 시간 고려)
        setTimeout(async () => {
          await loadClothesData({ 
            page: 1,
            category: null,
            season: null,
            search: null
          })
          await loadStatsData()
        }, 1000)
        
        handleCloseUploadModal()
        alert(result.message || "의류가 성공적으로 업로드되었습니다!")
      } else {
        alert(result.message || "업로드에 실패했습니다.")
      }
    } catch (error) {
      console.error("업로드 실패:", error)
      alert("업로드 중 오류가 발생했습니다.")
    } finally {
      setUploadLoading(false)
    }
  }

  // 업로드 모달 닫기 핸들러
  const handleCloseUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setUploadForm({
      category: "top",
      color: "black",
      season: "spring",
      style: "casual",
      name: "",
      brand: "",
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 미리보기 제거 핸들러
  const handleRemovePreview = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 의류 상세 보기
  const handleClothingDetail = async (clothing) => {
    try {
      // 상세 정보가 필요한 경우 API에서 다시 가져오기
      const detailData = await getClothing(clothing.id)
      setSelectedClothing(detailData)
      setShowDetailModal(true)
    } catch (error) {
      console.error("상세 정보 로드 실패:", error)
      // 기본 정보로 모달 표시
      setSelectedClothing(clothing)
      setShowDetailModal(true)
    }
  }

  // 의류 삭제 - 확인 모달 표시
  const handleDeleteClothing = (clothingId) => {
    setDeleteTargetId(clothingId)
    setShowDeleteModal(true)
  }

  // 실제 삭제 실행
  const confirmDeleteClothing = async () => {
    if (!deleteTargetId) return

    try {
      const result = await deleteClothing(deleteTargetId)

      if (result.success) {
        await loadClothesData() // 데이터 다시 로드
        await loadStatsData() // 통계 업데이트
        setShowDetailModal(false)
        setShowDeleteModal(false)
        setDeleteTargetId(null)
        alert(result.message || "의류가 삭제되었습니다.")
      } else {
        alert("삭제에 실패했습니다.")
      }
    } catch (error) {
      console.error("삭제 실패:", error)
      alert("삭제 중 오류가 발생했습니다.")
    }
  }

  // 삭제 취소
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteTargetId(null)
  }

  // 가상 피팅 시도
  const handleTryOn = (clothingId) => {
    // 의류 아이템 찾기
    const clothing = clothes.find(c => c.id === clothingId)
    if (!clothing) {
      alert("의류 정보를 찾을 수 없습니다.")
      return
    }

    // 마이페이지 방식과 동일하게 getClothingImageUrl 사용
    const clothingImageUrl = getClothingImageUrl(clothing.image_url)
    
    // 가상 피팅 페이지로 이동 (카테고리 정보 포함)
    const q = new URLSearchParams({
      clothingId: String(clothingId),
      clothingImage: clothingImageUrl ? encodeURIComponent(clothingImageUrl) : "",
      clothingCategory: clothing.category || "",
    }).toString()
    
    navigate(`/virtual-fitting?${q}`)
  }

  // 이미지 에러 처리 함수
  const handleImageError = (e) => {
    handleClothingImageError(e, "IMG")
  }

  // 페이지 변경
  const handlePageChange = (newPage) => {
    loadClothesData({ page: newPage })
  }

  if (loading) {
    return (
      <div className={styles.myCloset}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>로딩 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.myCloset}>
        <Header />
        <div className={styles.loadingContainer}>
          <p style={{ color: "var(--text-error)" }}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.emptyActionButton}>
            다시 시도
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.myCloset}>
      <Header />

      <main className={styles.closetMain}>
        <div className={styles.container}>
          <div className={styles.pageContainer}>
            {/* 헤더 섹션 */}
            <section className={styles.headerSection}>
              <div className={styles.headerContent}>
                <div className={styles.titleArea}>
                  <h1 className={styles.pageTitle}>내 옷장</h1>
                  <p className={styles.pageDescription}>
                    나만의 의류를 업로드하고 관리해보세요. 가상 피팅에서 활용할 수 있습니다.
                  </p>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.uploadButton} onClick={() => setShowUploadModal(true)}>
                    <Plus size={20} />
                    의류 추가
                  </button>
                </div>
              </div>
            </section>

            {/* 통계 섹션 */}
            <section className={styles.statsSection}>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.total_count}</div>
                  <div className={styles.statLabel}>전체 의류</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.category_counts?.top || 0}</div>
                  <div className={styles.statLabel}>상의</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.category_counts?.bottom || 0}</div>
                  <div className={styles.statLabel}>하의</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{stats.category_counts?.outer || 0}</div>
                  <div className={styles.statLabel}>아우터</div>
                </div>
              </div>
            </section>

            {/* 필터 섹션 */}
            <section className={styles.filterSection}>
              <div className={styles.searchArea}>
                <div className={styles.searchBox}>
                  <Search size={20} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="의류명, 브랜드로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              <div className={styles.filterArea}>
                <div className={styles.filterGroup}>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={styles.filterSelect}
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className={styles.filterSelect}
                  >
                    {seasons.map((season) => (
                      <option key={season.value} value={season.value}>
                        {season.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className={styles.filterSelect}
                  >
                    {colors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.viewControls}>
                  <button
                    className={`${styles.viewButton} ${viewMode === "grid" ? styles.active : ""}`}
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </section>

            {/* 의류 목록 섹션 */}
            <section className={styles.clothesSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  의류 목록 ({pagination.total}개)
                  {pagination.totalPages > 1 && (
                    <span style={{ fontSize: "0.9rem", fontWeight: "normal", color: "var(--text-secondary)" }}>
                      {" "}
                      - {pagination.page}/{pagination.totalPages} 페이지
                    </span>
                  )}
                </h2>
              </div>

              {filteredClothes.length > 0 ? (
                <>
                  <div className={`${styles.clothesGrid} ${viewMode === "list" ? styles.listView : ""}`}>
                    {filteredClothes.map((clothing) => (
                      <div key={clothing.id} className={styles.clothingItem}>
                        <div className={styles.clothingImage}>
                          <img
                            src={getClothingImageUrl(clothing.image_url) || "/placeholder.svg"}
                            alt={clothing.name}
                            onClick={() => handleClothingDetail(clothing)}
                            onError={handleImageError}
                          />
                          <div className={styles.imagePlaceholder} style={{ display: "none" }}>
                            <div className={styles.placeholderContent}>
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21,15 16,10 5,21" />
                              </svg>
                              <span>이미지가 없습니다</span>
                            </div>
                          </div>
                          <div className={styles.clothingOverlay}>
                            <button
                              className={styles.overlayButton}
                              onClick={() => handleClothingDetail(clothing)}
                              title="상세 보기"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className={styles.overlayButton}
                              onClick={() => handleTryOn(clothing.id)}
                              title="가상 피팅"
                            >
                              <Camera size={16} />
                            </button>
                          </div>
                        </div>

                        <div className={styles.clothingInfo}>
                          <h3 className={styles.clothingName}>{clothing.name}</h3>
                          <p className={styles.clothingBrand}>{clothing.brand || "브랜드 미지정"}</p>
                          <div className={styles.clothingMeta}>
                            <span className={styles.clothingCategory}>
                              {categories.find((c) => c.value === clothing.category)?.label}
                            </span>
                            <span className={styles.clothingStyle}>
                              {stylesOptions.find((s) => s.value === clothing.style)?.label}
                            </span>
                            <span className={styles.clothingDate}>
                              {new Date(clothing.created_at).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 페이지네이션 */}
                  {pagination.totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "0.5rem",
                        marginTop: "2rem",
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid var(--border-color)",
                          backgroundColor: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          borderRadius: "4px",
                          cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                          opacity: pagination.page <= 1 ? 0.5 : 1,
                        }}
                      >
                        이전
                      </button>

                      <span style={{ color: "var(--text-secondary)" }}>
                        {pagination.page} / {pagination.totalPages}
                      </span>

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid var(--border-color)",
                          backgroundColor: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          borderRadius: "4px",
                          cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer",
                          opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                        }}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyContent}>
                  <div className={styles.emptyIcon}>
                    <Upload size={64} />
                  </div>
                  <h3>의류가 없습니다</h3>
                  <p>첫 번째 의류를 업로드해보세요!</p>
                  <button className={styles.emptyActionButton} onClick={() => setShowUploadModal(true)}>
                    의류 추가하기
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: "800px" }}>
            <div className={styles.modalHeader}>
              <h2>의류 업로드</h2>
              <button className={styles.closeButton} onClick={handleCloseUploadModal}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.uploadFormContainer}>
                <div className={styles.uploadArea}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className={styles.fileInput}
                  />

                  {!previewUrl ? (
                    <div className={styles.uploadBox}>
                      <Upload size={64} />
                      <h3>의류 사진을 선택하세요</h3>
                      <p>JPG, PNG, WEBP 형식 (최대 10MB)</p>
                      <button
                        className={styles.uploadTrigger}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLoading}
                      >
                        파일 선택
                      </button>
                    </div>
                  ) : (
                    <div className={styles.previewContainer}>
                      <div className={styles.previewImage}>
                        <img src={previewUrl || "/placeholder.svg"} alt="미리보기" />
                        <button
                          className={styles.removePreviewButton}
                          onClick={handleRemovePreview}
                          title="이미지 제거"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className={styles.previewInfo}>
                        <p className={styles.fileName}>{selectedFile?.name}</p>
                        <p className={styles.fileSize}>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.uploadForm}>
                  <h4>의류 정보</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>의류명 *</label>
                      <input
                        type="text"
                        value={uploadForm.name}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="의류명을 입력하세요"
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>브랜드</label>
                      <input
                        type="text"
                        value={uploadForm.brand}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, brand: e.target.value }))}
                        placeholder="브랜드명을 입력하세요"
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>카테고리</label>
                      <select
                        value={uploadForm.category}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, category: e.target.value }))}
                        className={styles.formSelect}
                      >
                        {VALID_CATEGORIES.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>색상</label>
                      <select
                        value={uploadForm.color}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, color: e.target.value }))}
                        className={styles.formSelect}
                      >
                        {colors
                          .filter((c) => c.value !== "all")
                          .map((color) => (
                            <option key={color.value} value={color.value}>
                              {color.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>계절</label>
                      <select
                        value={uploadForm.season}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, season: e.target.value }))}
                        className={styles.formSelect}
                      >
                        {VALID_SEASONS.map((season) => (
                          <option key={season.value} value={season.value}>
                            {season.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>스타일</label>
                      <select
                        value={uploadForm.style}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, style: e.target.value }))}
                        className={styles.formSelect}
                      >
                        {stylesOptions.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {previewUrl && (
                    <div className={styles.uploadActions}>
                      <button
                        className={styles.cancelUploadButton}
                        onClick={handleRemovePreview}
                        disabled={uploadLoading}
                      >
                        다시 선택
                      </button>
                      <button
                        className={styles.confirmUploadButton}
                        onClick={handleConfirmUpload}
                        disabled={uploadLoading || !uploadForm.name.trim()}
                      >
                        {uploadLoading ? "업로드 중..." : "업로드 확인"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.uploadTips}>
                <h4>📸 촬영 팁</h4>
                <ul>
                  <li>밝은 곳에서 촬영하세요</li>
                  <li>의류가 잘 보이도록 펼쳐서 촬영하세요</li>
                  <li>배경은 단색으로 깔끔하게 정리하세요</li>
                  <li>의류의 전체적인 모습이 보이도록 촬영하세요</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedClothing && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>의류 상세 정보</h2>
              <button className={styles.closeButton} onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailContent}>
                <div className={styles.detailImage}>
                  <img
                    src={getClothingImageUrl(selectedClothing.image_url) || "/placeholder.svg"}
                    alt={selectedClothing.name}
                  />
                </div>

                <div className={styles.detailInfo}>
                  <h3>{selectedClothing.name}</h3>
                  <p className={styles.detailBrand}>{selectedClothing.brand || "브랜드 미지정"}</p>

                  <div className={styles.detailMeta}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>카테고리:</span>
                      <span className={styles.metaValue}>
                        {categories.find((c) => c.value === selectedClothing.category)?.label}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>색상:</span>
                      <span className={styles.metaValue}>
                        {colors.find((c) => c.value === selectedClothing.color)?.label}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>계절:</span>
                      <span className={styles.metaValue}>
                        {seasons.find((s) => s.value === selectedClothing.season)?.label}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>스타일:</span>
                      <span className={styles.metaValue}>
                        {stylesOptions.find((s) => s.value === selectedClothing.style)?.label}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>등록일:</span>
                      <span className={styles.metaValue}>
                        {new Date(selectedClothing.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailActions}>
                    <button className={styles.tryOnButton} onClick={() => handleTryOn(selectedClothing.id)}>
                      <Camera size={16} />
                      가상 피팅
                    </button>
                    <button className={styles.deleteButton} onClick={() => handleDeleteClothing(selectedClothing.id)}>
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: "400px" }}>
            <div className={styles.modalHeader}>
              <h2>의류 삭제</h2>
              <button className={styles.closeButton} onClick={cancelDelete}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ textAlign: "center", marginBottom: "2rem", color: "var(--text-primary)" }}>
                정말로 이 의류를 삭제하시겠습니까?
                <br />
                <strong>삭제된 의류는 복구할 수 없습니다.</strong>
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className={styles.cancelButton}
                  onClick={cancelDelete}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  취소
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={confirmDeleteClothing}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default MyCloset

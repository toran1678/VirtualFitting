"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import styles from "./ClothingCustomizer.module.css"
import {
  Palette,
  Type,
  ImageIcon,
  Layers,
  RotateCcw,
  Save,
  Download,
  Share2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move3D,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

const ClothingCustomizer = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const previewContainerRef = useRef(null) // 드래그용 ref
  const downloadCanvasRef = useRef(null) // 다운로드용 ref

  // 사용자 데이터
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // 커스터마이징 상태
  const [selectedProduct, setSelectedProduct] = useState({
    id: 1,
    name: "베이직 티셔츠",
    category: "top",
    image:
      "https://image.msscdn.net/thumbnails/images/goods_img/20250414/5021488/5021488_17458995624183_big.jpg?w=1200",
  })

  // 레이어 시스템
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [layerIdCounter, setLayerIdCounter] = useState(1)

  const [customization, setCustomization] = useState({
    color: "#ffffff",
    size: "M",
    pattern: null,
    material: "cotton",
  })

  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 })

  const [activeTab, setActiveTab] = useState("color")
  const [previewMode, setPreviewMode] = useState("front")
  const [zoom, setZoom] = useState(100)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)

  // 제품 옵션
  const productOptions = {
    colors: [
      { name: "화이트", value: "#ffffff", filter: "brightness(1)" },
      { name: "블랙", value: "#000000", filter: "brightness(0.3)" },
      { name: "네이비", value: "#1e3a8a", filter: "hue-rotate(220deg) saturate(1.5) brightness(0.7)" },
      { name: "그레이", value: "#6b7280", filter: "brightness(0.6) saturate(0)" },
      { name: "레드", value: "#dc2626", filter: "hue-rotate(0deg) saturate(1.5) brightness(0.8)" },
      { name: "그린", value: "#16a34a", filter: "hue-rotate(120deg) saturate(1.3) brightness(0.8)" },
      { name: "옐로우", value: "#eab308", filter: "hue-rotate(60deg) saturate(1.5) brightness(1.1)" },
      { name: "퍼플", value: "#9333ea", filter: "hue-rotate(280deg) saturate(1.4) brightness(0.9)" },
      { name: "핑크", value: "#ec4899", filter: "hue-rotate(320deg) saturate(1.3) brightness(1)" },
      { name: "오렌지", value: "#f97316", filter: "hue-rotate(30deg) saturate(1.4) brightness(1)" },
    ],
    fonts: [
      "Arial",
      "Helvetica",
      "Times New Roman",
      "Georgia",
      "Verdana",
      "Comic Sans MS",
      "Impact",
      "Trebuchet MS",
      "Roboto",
      "Open Sans",
    ],
    patterns: [
      { name: "없음", value: null },
      { name: "스트라이프", value: "stripe" },
      { name: "도트", value: "dot" },
      { name: "체크", value: "check" },
      { name: "그라데이션", value: "gradient" },
    ],
  }

  // 제품 목록
  const products = [
    {
      id: 1,
      name: "베이직 티셔츠",
      category: "top",
      image:
        "https://image.msscdn.net/thumbnails/images/goods_img/20250414/5021488/5021488_17458995624183_big.jpg?w=1200",
    },
    {
      id: 2,
      name: "후드 티셔츠",
      category: "top",
      image:
        "https://image.msscdn.net/thumbnails/images/goods_img/20250414/5021488/5021488_17458995624183_big.jpg?w=1200",
    },
    {
      id: 3,
      name: "맨투맨",
      category: "top",
      image:
        "https://image.msscdn.net/thumbnails/images/goods_img/20250414/5021488/5021488_17458995624183_big.jpg?w=1200",
    },
    {
      id: 4,
      name: "긴팔 티셔츠",
      category: "top",
      image:
        "https://image.msscdn.net/thumbnails/images/goods_img/20250414/5021488/5021488_17458995624183_big.jpg?w=1200",
    },
  ]

  // 새 텍스트 레이어 추가
  const addTextLayer = useCallback(() => {
    const newLayer = {
      id: layerIdCounter,
      type: "text",
      content: "새 텍스트",
      position: { x: 50, y: 30 + layers.length * 10 },
      style: {
        color: "#000000",
        fontSize: 16,
        fontFamily: "Arial",
      },
      visible: true,
    }
    setLayers((prev) => [...prev, newLayer])
    setLayerIdCounter((prev) => prev + 1)
    setSelectedLayerId(newLayer.id)
    console.log("✅ 텍스트 레이어 추가됨:", newLayer)
  }, [layerIdCounter, layers.length])

  // 새 로고 레이어 추가
  const addLogoLayer = useCallback(
    (imageData) => {
      const newLayer = {
        id: layerIdCounter,
        type: "logo",
        content: imageData,
        position: { x: 50, y: 70 + layers.length * 10 },
        style: {
          size: 100,
        },
        visible: true,
      }
      setLayers((prev) => [...prev, newLayer])
      setLayerIdCounter((prev) => prev + 1)
      setSelectedLayerId(newLayer.id)
      console.log("✅ 로고 레이어 추가됨:", newLayer)
    },
    [layerIdCounter, layers.length],
  )

  // 레이어 삭제
  const deleteLayer = useCallback(
    (layerId) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== layerId))
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null)
      }
      console.log("🗑️ 레이어 삭제됨:", layerId)
    },
    [selectedLayerId],
  )

  // 레이어 순서 변경
  const moveLayer = useCallback((layerId, direction) => {
    setLayers((prevLayers) => {
      const currentIndex = prevLayers.findIndex((layer) => layer.id === layerId)
      if (currentIndex === -1) return prevLayers

      const newLayers = [...prevLayers]
      const targetIndex = direction === "up" ? currentIndex + 1 : currentIndex - 1

      if (targetIndex >= 0 && targetIndex < newLayers.length) {
        ;[newLayers[currentIndex], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[currentIndex]]
        console.log(`🔄 레이어 ${layerId} ${direction}로 이동`)
        return newLayers
      }
      return prevLayers
    })
  }, [])

  // 레이어 업데이트 (즉시 적용)
  const updateLayer = useCallback((layerId, updates) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) => {
        if (layer.id === layerId) {
          const updatedLayer = { ...layer, ...updates }
          return updatedLayer
        }
        return layer
      }),
    )
  }, [])

  // 히스토리 관리
  const saveToHistory = useCallback(() => {
    const newState = { customization, layers }
    setHistory((prevHistory) => {
      const newHistory = prevHistory.slice(0, historyIndex + 1)
      newHistory.push(newState)
      setHistoryIndex(newHistory.length - 1)
      console.log("💾 히스토리 저장됨")
      return newHistory
    })
  }, [customization, layers, historyIndex])

  // 드래그 시작
  const handleDragStart = useCallback(
    (e, layerId) => {
      e.preventDefault()
      e.stopPropagation()

      console.log("🖱️ 드래그 시작 시도:", layerId)

      if (!previewContainerRef.current) {
        console.warn("⚠️ Preview container not ready")
        return
      }

      if (e.shiftKey || isPanMode) {
        // 팬 모드
        const rect = previewContainerRef.current.getBoundingClientRect()
        setPanStartPos({
          x: e.clientX - rect.left - panOffset.x,
          y: e.clientY - rect.top - panOffset.y,
        })
        setIsDragging("pan")
        console.log("🔄 팬 모드 시작")
        return
      }

      const rect = previewContainerRef.current.getBoundingClientRect()
      const startX = e.clientX - rect.left
      const startY = e.clientY - rect.top

      const layer = layers.find((l) => l.id === layerId)
      if (!layer) {
        console.warn("⚠️ 레이어를 찾을 수 없음:", layerId)
        return
      }

      setIsDragging(layerId)
      setSelectedLayerId(layerId)

      const currentX = (layer.position.x / 100) * rect.width
      const currentY = (layer.position.y / 100) * rect.height
      setDragOffset({ x: startX - currentX, y: startY - currentY })

      console.log("✅ 드래그 시작 성공:", layerId, { startX, startY, currentX, currentY })
    },
    [layers, isPanMode, panOffset],
  )

  // 드래그 중
  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !previewContainerRef.current) return

      e.preventDefault()
      const rect = previewContainerRef.current.getBoundingClientRect()

      if (isDragging === "pan") {
        const newX = e.clientX - rect.left - panStartPos.x
        const newY = e.clientY - rect.top - panStartPos.y
        setPanOffset({ x: newX, y: newY })
        return
      }

      const currentX = e.clientX - rect.left - dragOffset.x
      const currentY = e.clientY - rect.top - dragOffset.y

      // 퍼센트로 변환 (0-100%)
      const percentX = Math.max(0, Math.min(100, (currentX / rect.width) * 100))
      const percentY = Math.max(0, Math.min(100, (currentY / rect.height) * 100))

      // 즉시 업데이트
      updateLayer(isDragging, {
        position: { x: percentX, y: percentY },
      })
    },
    [isDragging, dragOffset, panStartPos, updateLayer],
  )

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    if (isDragging && isDragging !== "pan") {
      console.log("✅ 드래그 종료, 히스토리 저장")
      saveToHistory()
    }
    setIsDragging(null)
    setDragOffset({ x: 0, y: 0 })
  }, [isDragging, saveToHistory])

  // 드래그 이벤트 리스너 등록
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => handleDragMove(e)
      const handleMouseUp = () => handleDragEnd()

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // 초기 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }

      const user = getCurrentUser()
      setUserData(user)
      setLoading(false)

      // 초기 히스토리 설정
      const initialState = { customization, layers: [] }
      setHistory([initialState])
      setHistoryIndex(0)
      console.log("🚀 초기화 완료")
    }

    checkAuth()
  }, [navigate])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setCustomization(prevState.customization)
      setLayers(prevState.layers)
      setHistoryIndex(historyIndex - 1)
      console.log("↩️ 실행 취소")
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setCustomization(nextState.customization)
      setLayers(nextState.layers)
      setHistoryIndex(historyIndex + 1)
      console.log("↪️ 다시 실행")
    }
  }, [history, historyIndex])

  // 제품 선택
  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product)
    const resetCustomization = {
      color: "#ffffff",
      size: "M",
      pattern: null,
      material: "cotton",
    }
    setCustomization(resetCustomization)
    setLayers([])
    setSelectedLayerId(null)
    setHistory([{ customization: resetCustomization, layers: [] }])
    setHistoryIndex(0)
    console.log("👕 제품 선택됨:", product.name)
  }, [])

  // 파일 업로드 핸들러
  const handleLogoUpload = useCallback(
    (event) => {
      const file = event.target.files[0]
      if (file) {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("파일 크기는 5MB 이하여야 합니다.")
          return
        }

        // 파일 형식 체크
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
          alert("JPG, PNG, WEBP 파일만 업로드 가능합니다.")
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          addLogoLayer(e.target.result)
        }
        reader.readAsDataURL(file)
      }
    },
    [addLogoLayer],
  )

  // 🎯 완전히 개선된 고화질 이미지 다운로드 기능
  const handleDownload = useCallback(async () => {
    try {
      console.log("📸 고화질 다운로드 시작")

      // 고해상도 캔버스 생성 (4배 크기)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // 고해상도 설정
      const scale = 4 // 4배 해상도
      const width = 400 * scale
      const height = 500 * scale

      canvas.width = width
      canvas.height = height

      // 고해상도 렌더링을 위한 스케일 적용
      ctx.scale(scale, scale)

      console.log("🎨 캔버스 크기:", width, "x", height)

      // 1단계: 의류 배경 이미지 그리기
      console.log("👕 의류 이미지 로딩 중...")
      const clothingImage = new Image()
      clothingImage.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        clothingImage.onload = () => {
          console.log("✅ 의류 이미지 로드 성공")
          // 의류 이미지를 캔버스 크기에 맞게 그리기
          ctx.drawImage(clothingImage, 0, 0, 400, 500)

          // 색상 필터 적용
          const colorOption = productOptions.colors.find((c) => c.value === customization.color)
          if (colorOption && colorOption.filter !== "brightness(1)") {
            console.log("🎨 색상 필터 적용:", customization.color)
            ctx.globalCompositeOperation = "multiply"
            ctx.fillStyle = customization.color
            ctx.fillRect(0, 0, 400, 500)
            ctx.globalCompositeOperation = "source-over"
          }

          resolve()
        }

        clothingImage.onerror = () => {
          console.warn("⚠️ 의류 이미지 로드 실패, 기본 배경 사용")
          // 기본 배경색으로 대체
          ctx.fillStyle = customization.color
          ctx.fillRect(0, 0, 400, 500)
          resolve()
        }

        clothingImage.src = selectedProduct.image
      })

      // 2단계: 패턴 그리기
      if (customization.pattern) {
        console.log("🎭 패턴 적용:", customization.pattern)
        ctx.globalAlpha = 0.3
        ctx.fillStyle = "#000000"

        if (customization.pattern === "stripe") {
          for (let i = 0; i < 400; i += 20) {
            ctx.fillRect(i, 0, 10, 500)
          }
        } else if (customization.pattern === "dot") {
          for (let x = 10; x < 400; x += 30) {
            for (let y = 10; y < 500; y += 30) {
              ctx.beginPath()
              ctx.arc(x, y, 5, 0, 2 * Math.PI)
              ctx.fill()
            }
          }
        } else if (customization.pattern === "check") {
          for (let x = 0; x < 400; x += 40) {
            for (let y = 0; y < 500; y += 40) {
              if ((Math.floor(x / 40) + Math.floor(y / 40)) % 2 === 0) {
                ctx.fillRect(x, y, 40, 40)
              }
            }
          }
        }
        ctx.globalAlpha = 1
      }

      // 3단계: 레이어들 그리기
      console.log("🎨 레이어 렌더링 시작, 총", layers.length, "개")
      for (const layer of layers) {
        if (!layer.visible) {
          console.log("👁️ 숨겨진 레이어 스킵:", layer.id)
          continue
        }

        const x = (layer.position.x / 100) * 400
        const y = (layer.position.y / 100) * 500

        if (layer.type === "text") {
          console.log("📝 텍스트 레이어 렌더링:", layer.content)
          ctx.font = `${layer.style.fontSize}px ${layer.style.fontFamily}`
          ctx.fillStyle = layer.style.color
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(layer.content, x, y)
        } else if (layer.type === "logo") {
          console.log("🖼️ 로고 레이어 렌더링")
          try {
            const logoImage = new Image()
            logoImage.crossOrigin = "anonymous"
            await new Promise((logoResolve, logoReject) => {
              logoImage.onload = () => {
                const size = layer.style.size
                ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size)
                console.log("✅ 로고 렌더링 완료")
                logoResolve()
              }
              logoImage.onerror = () => {
                console.warn("⚠️ 로고 이미지 로드 실패")
                logoReject()
              }
              logoImage.src = layer.content
            })
          } catch (error) {
            console.warn("⚠️ 로고 렌더링 실패:", error)
          }
        }
      }

      // 4단계: 고화질 다운로드
      console.log("💾 고화질 이미지 생성 중...")
      const link = document.createElement("a")
      link.download = `custom-${selectedProduct.name}-${Date.now()}.png`
      link.href = canvas.toDataURL("image/png", 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("🎉 고화질 다운로드 완료!")
      alert("고화질 이미지가 다운로드되었습니다! 🎉")
    } catch (error) {
      console.error("❌ 다운로드 실패:", error)
      alert("다운로드 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }, [customization, layers, selectedProduct, productOptions.colors])

  // 저장 및 공유 기능
  const handleSave = useCallback(async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert("디자인이 저장되었습니다!")
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `내가 디자인한 ${selectedProduct.name}`,
          text: "나만의 커스텀 의류를 확인해보세요!",
          url: window.location.href,
        })
      } catch (error) {
        console.log("공유 취소됨")
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("링크가 클립보드에 복사되었습니다!")
    }
  }, [selectedProduct.name])

  const handleReset = useCallback(() => {
    if (window.confirm("모든 커스터마이징을 초기화하시겠습니까?")) {
      const resetCustomization = {
        color: "#ffffff",
        size: "M",
        pattern: null,
        material: "cotton",
      }
      setCustomization(resetCustomization)
      setLayers([])
      setSelectedLayerId(null)
      setHistory([{ customization: resetCustomization, layers: [] }])
      setHistoryIndex(0)
      console.log("🔄 초기화 완료")
    }
  }, [])

  if (loading) {
    return (
      <div className={styles.customizer}>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>로딩 중...</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.customizer}>
      <Header />

      <main className={styles.customizerMain}>
        <div className={styles.container}>
          <div className={styles.pageContainer}>
            {/* 헤더 섹션 */}
            <section className={styles.headerSection}>
              <div className={styles.headerContent}>
                <div className={styles.titleArea}>
                  <h1 className={styles.pageTitle}>의류 커스터마이징</h1>
                  <p className={styles.pageDescription}>가상 피팅을 위한 나만의 특별한 의류를 디자인해보세요</p>
                </div>

                {/* 액션 버튼들 */}
                <div className={styles.headerActions}>
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className={`${styles.actionButton} ${historyIndex <= 0 ? styles.disabled : ""}`}
                    title="실행 취소"
                  >
                    <Undo size={18} />
                  </button>

                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className={`${styles.actionButton} ${historyIndex >= history.length - 1 ? styles.disabled : ""}`}
                    title="다시 실행"
                  >
                    <Redo size={18} />
                  </button>

                  <button onClick={handleShare} className={styles.actionButton} title="공유하기">
                    <Share2 size={18} />
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className={`${styles.saveButton} ${isLoading ? styles.loading : ""}`}
                  >
                    <Save size={18} />
                    {isLoading ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            </section>

            {/* 제품 선택 섹션 */}
            <section className={styles.productSection}>
              <h2 className={styles.sectionTitle}>제품 선택</h2>
              <div className={styles.productGrid}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`${styles.productItem} ${selectedProduct.id === product.id ? styles.selected : ""}`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className={styles.productImage}>
                      <img src={product.image || "/placeholder.svg"} alt={product.name} />
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className={styles.mainContent}>
              {/* 미리보기 영역 */}
              <div className={styles.previewSection}>
                <div className={styles.previewHeader}>
                  <h2 className={styles.sectionTitle}>미리보기</h2>

                  <div className={styles.previewControls}>
                    {/* 뷰 모드 선택 */}
                    <div className={styles.viewModeSelector}>
                      {["front", "back", "side"].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPreviewMode(mode)}
                          className={`${styles.viewModeButton} ${previewMode === mode ? styles.active : ""}`}
                        >
                          {mode === "front" ? "앞면" : mode === "back" ? "뒷면" : "옆면"}
                        </button>
                      ))}
                    </div>

                    {/* 줌 컨트롤 */}
                    <div className={styles.zoomControls}>
                      <button
                        onClick={() => setZoom(Math.max(50, zoom - 25))}
                        className={styles.zoomButton}
                        disabled={zoom <= 50}
                      >
                        <ZoomOut size={16} />
                      </button>
                      <span className={styles.zoomLevel}>{zoom}%</span>
                      <button
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        className={styles.zoomButton}
                        disabled={zoom >= 200}
                      >
                        <ZoomIn size={16} />
                      </button>
                    </div>

                    {/* 팬 모드 토글 */}
                    <button
                      onClick={() => setIsPanMode(!isPanMode)}
                      className={`${styles.overlayToggle} ${isPanMode ? styles.active : ""}`}
                      title="팬 모드 (Shift+드래그로도 가능)"
                    >
                      <Move3D size={16} />팬 모드
                    </button>
                  </div>
                </div>

                {/* 미리보기 캔버스 */}
                <div className={styles.previewCanvas}>
                  <div
                    className={styles.previewContainer}
                    style={{
                      transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                      cursor: isPanMode ? "grab" : "default",
                    }}
                  >
                    {/* 의류 컨테이너 */}
                    <div
                      ref={previewContainerRef}
                      className={styles.clothingContainer}
                      style={{
                        backgroundColor: customization.color,
                        backgroundImage: `url(${selectedProduct.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter:
                          productOptions.colors.find((c) => c.value === customization.color)?.filter || "brightness(1)",
                      }}
                    >
                      {/* 다운로드용 숨겨진 캔버스 */}
                      <canvas ref={downloadCanvasRef} style={{ display: "none" }} width={400} height={500} />

                      {/* 패턴 오버레이 */}
                      {customization.pattern && (
                        <div className={`${styles.patternOverlay} ${styles[customization.pattern]}`} />
                      )}

                      {/* 레이어들 렌더링 */}
                      {layers.map((layer) => {
                        if (!layer.visible) return null

                        if (layer.type === "text") {
                          return (
                            <div
                              key={layer.id}
                              className={`${styles.textOverlay} ${isDragging === layer.id ? styles.dragging : ""} ${
                                selectedLayerId === layer.id ? styles.selected : ""
                              }`}
                              style={{
                                left: `${layer.position.x}%`,
                                top: `${layer.position.y}%`,
                                color: layer.style.color,
                                fontSize: `${layer.style.fontSize}px`,
                                fontFamily: layer.style.fontFamily,
                                cursor: "move",
                                transition: isDragging === layer.id ? "none" : "all 0.1s ease",
                                userSelect: "none",
                              }}
                              onMouseDown={(e) => handleDragStart(e, layer.id)}
                            >
                              {layer.content}
                            </div>
                          )
                        } else if (layer.type === "logo") {
                          return (
                            <img
                              key={layer.id}
                              src={layer.content || "/placeholder.svg"}
                              alt="Custom Logo"
                              className={`${styles.logoOverlay} ${isDragging === layer.id ? styles.dragging : ""} ${
                                selectedLayerId === layer.id ? styles.selected : ""
                              }`}
                              style={{
                                left: `${layer.position.x}%`,
                                top: `${layer.position.y}%`,
                                width: `${layer.style.size}px`,
                                cursor: "move",
                                transition: isDragging === layer.id ? "none" : "all 0.1s ease",
                                userSelect: "none",
                              }}
                              onMouseDown={(e) => handleDragStart(e, layer.id)}
                              draggable={false}
                            />
                          )
                        }
                        return null
                      })}

                      {/* 드래그 가이드 */}
                      {isDragging && isDragging !== "pan" && (
                        <div className={styles.dragGuide}>드래그하여 위치를 조정하세요</div>
                      )}
                    </div>
                  </div>

                  {/* 힌트 */}
                  <div className={styles.rotationHint}>
                    <Move3D size={16} />
                    <span>Shift+드래그: 팬 모드 | 요소 클릭: 선택 및 이동</span>
                  </div>
                </div>

                {/* 제품 정보 */}
                <div className={styles.productInfoCard}>
                  <h3 className={styles.productTitle}>{selectedProduct.name}</h3>
                  <p className={styles.productDescription}>가상 피팅용 커스터마이징</p>
                </div>
              </div>

              {/* 커스터마이징 패널 */}
              <div className={styles.customizationPanel}>
                {/* 탭 네비게이션 */}
                <div className={styles.tabNavigation}>
                  {[
                    { id: "color", label: "색상", icon: Palette },
                    { id: "text", label: "텍스트", icon: Type },
                    { id: "logo", label: "로고", icon: ImageIcon },
                    { id: "layers", label: "레이어", icon: Layers },
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ""}`}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* 탭 콘텐츠 */}
                <div className={styles.tabContent}>
                  {/* 색상 탭 */}
                  {activeTab === "color" && (
                    <div className={styles.colorTab}>
                      <div className={styles.optionGroup}>
                        <h4 className={styles.optionTitle}>의류 색상</h4>
                        <div className={styles.colorGrid}>
                          {productOptions.colors.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => {
                                setCustomization({ ...customization, color: color.value })
                                saveToHistory()
                              }}
                              className={`${styles.colorOption} ${
                                customization.color === color.value ? styles.selected : ""
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className={styles.optionGroup}>
                        <h4 className={styles.optionTitle}>패턴</h4>
                        <div className={styles.patternOptions}>
                          {productOptions.patterns.map((pattern) => (
                            <label key={pattern.value} className={styles.radioOption}>
                              <input
                                type="radio"
                                name="pattern"
                                value={pattern.value || ""}
                                checked={customization.pattern === pattern.value}
                                onChange={(e) => {
                                  setCustomization({
                                    ...customization,
                                    pattern: e.target.value === "" ? null : e.target.value,
                                  })
                                  saveToHistory()
                                }}
                              />
                              <span className={styles.radioLabel}>{pattern.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 텍스트 탭 */}
                  {activeTab === "text" && (
                    <div className={styles.textTab}>
                      <div className={styles.optionGroup}>
                        <button onClick={addTextLayer} className={styles.addButton}>
                          <Plus size={16} />새 텍스트 추가
                        </button>
                      </div>

                      {selectedLayerId && layers.find((l) => l.id === selectedLayerId && l.type === "text") && (
                        <>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              텍스트 내용
                              <input
                                type="text"
                                value={layers.find((l) => l.id === selectedLayerId)?.content || ""}
                                onChange={(e) => {
                                  updateLayer(selectedLayerId, { content: e.target.value })
                                }}
                                onBlur={saveToHistory}
                                placeholder="텍스트를 입력하세요"
                                className={styles.textInput}
                              />
                            </label>
                          </div>

                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              텍스트 색상
                              <input
                                type="color"
                                value={layers.find((l) => l.id === selectedLayerId)?.style.color || "#000000"}
                                onChange={(e) => {
                                  updateLayer(selectedLayerId, {
                                    style: {
                                      ...layers.find((l) => l.id === selectedLayerId)?.style,
                                      color: e.target.value,
                                    },
                                  })
                                  saveToHistory()
                                }}
                                className={styles.colorInput}
                              />
                            </label>
                          </div>

                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              폰트
                              <select
                                value={layers.find((l) => l.id === selectedLayerId)?.style.fontFamily || "Arial"}
                                onChange={(e) => {
                                  updateLayer(selectedLayerId, {
                                    style: {
                                      ...layers.find((l) => l.id === selectedLayerId)?.style,
                                      fontFamily: e.target.value,
                                    },
                                  })
                                  setTimeout(saveToHistory, 100)
                                }}
                                className={styles.selectInput}
                              >
                                {productOptions.fonts.map((font) => (
                                  <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              텍스트 크기: {layers.find((l) => l.id === selectedLayerId)?.style.fontSize || 16}px
                              <input
                                type="range"
                                min="12"
                                max="48"
                                value={layers.find((l) => l.id === selectedLayerId)?.style.fontSize || 16}
                                onChange={(e) => {
                                  updateLayer(selectedLayerId, {
                                    style: {
                                      ...layers.find((l) => l.id === selectedLayerId)?.style,
                                      fontSize: Number.parseInt(e.target.value),
                                    },
                                  })
                                }}
                                onMouseUp={saveToHistory}
                                className={styles.rangeInput}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 로고 탭 */}
                  {activeTab === "logo" && (
                    <div className={styles.logoTab}>
                      <div className={styles.optionGroup}>
                        <label className={styles.inputLabel}>
                          로고 업로드
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className={styles.fileInput}
                          />
                          <span className={styles.inputHint}>JPG, PNG, WEBP 파일 지원 (최대 5MB)</span>
                        </label>
                      </div>

                      {selectedLayerId && layers.find((l) => l.id === selectedLayerId && l.type === "logo") && (
                        <div className={styles.optionGroup}>
                          <label className={styles.inputLabel}>
                            로고 크기: {layers.find((l) => l.id === selectedLayerId)?.style.size || 100}px
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={layers.find((l) => l.id === selectedLayerId)?.style.size || 100}
                              onChange={(e) => {
                                updateLayer(selectedLayerId, {
                                  style: {
                                    ...layers.find((l) => l.id === selectedLayerId)?.style,
                                    size: Number.parseInt(e.target.value),
                                  },
                                })
                              }}
                              onMouseUp={saveToHistory}
                              className={styles.rangeInput}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 레이어 탭 */}
                  {activeTab === "layers" && (
                    <div className={styles.layersTab}>
                      <div className={styles.optionGroup}>
                        <h4 className={styles.optionTitle}>레이어 관리</h4>
                        <div className={styles.layersList}>
                          {layers.map((layer, index) => (
                            <div
                              key={layer.id}
                              className={`${styles.layerItem} ${selectedLayerId === layer.id ? styles.selected : ""}`}
                              onClick={() => setSelectedLayerId(layer.id)}
                            >
                              <div className={styles.layerInfo}>
                                <span className={styles.layerType}>
                                  {layer.type === "text" ? <Type size={16} /> : <ImageIcon size={16} />}
                                </span>
                                <span className={styles.layerName}>
                                  {layer.type === "text" ? layer.content || "텍스트" : "로고"}
                                </span>
                              </div>
                              <div className={styles.layerControls}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateLayer(layer.id, { visible: !layer.visible })
                                  }}
                                  className={styles.layerButton}
                                  title={layer.visible ? "숨기기" : "보이기"}
                                >
                                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLayer(layer.id, "up")
                                  }}
                                  className={styles.layerButton}
                                  disabled={index === layers.length - 1}
                                  title="위로"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLayer(layer.id, "down")
                                  }}
                                  className={styles.layerButton}
                                  disabled={index === 0}
                                  title="아래로"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteLayer(layer.id)
                                  }}
                                  className={`${styles.layerButton} ${styles.deleteButton}`}
                                  title="삭제"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {layers.length === 0 && (
                            <div className={styles.emptyLayers}>
                              <p>레이어가 없습니다.</p>
                              <p>텍스트나 로고를 추가해보세요!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 액션 버튼들 */}
                <div className={styles.actionButtons}>
                  <button onClick={handleDownload} className={styles.downloadButton}>
                    <Download size={20} />
                    고화질 이미지 다운로드
                  </button>

                  <div className={styles.secondaryActions}>
                    <button onClick={handleReset} className={styles.secondaryButton}>
                      <RotateCcw size={16} />
                      초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ClothingCustomizer

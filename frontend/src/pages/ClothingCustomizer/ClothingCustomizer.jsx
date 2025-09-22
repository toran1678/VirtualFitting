"use client"

import { useState, useEffect, useRef, useCallback, useContext } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import { createCustomClothing } from "../../api/customClothingAPI"
import { ThemeContext } from "../../context/ThemeContext"
import styles from "./ClothingCustomizer.module.css"
import {
  Palette, Type, ImageIcon, Layers, RotateCcw, Save, Download, Share2,
  Undo, Redo, ZoomIn, ZoomOut, Eye, EyeOff, Plus, Trash2,
  ChevronUp, ChevronDown,
} from "lucide-react"

const BASE_ZOOM = 150; // 미리보기 기본 확대 배율
// 텍스트 색상 팔레트
const TEXT_SWATCHES = [
  "#0f172a", "#6d28d9", "#16a34a", "#000000", "#ffffff",
  "#60a5fa", "#f59e0b", "#facc15", "#fecdd3", "#9ca3af",
  "#ef4444", "#a78bfa", "#14b8a6", "#22c55e", "#3b82f6",
  "#fde68a", "#6b7280", "#dcfce7", "#bfdbfe", "#f3f4f6",
];
// 스티커 목록 
const STICKERS = [
  {
    id: "face",
    name: "표정",
    cover: "/stickers/face/smile2.png",
    items: [
      "/stickers/face/smile1.png",
      "/stickers/face/smile2.png",
      "/stickers/face/smile3.png",
      "/stickers/face/love1.png",
      "/stickers/face/love2.png",
      "/stickers/face/love3.png",
      "/stickers/face/sleep1.png",
      "/stickers/face/sleep2.png",
      "/stickers/face/raise.png",
      "/stickers/face/pleading.png",
      "/stickers/face/yammy.png",
      "/stickers/face/money.png",
      "/stickers/face/grinning.png",
      "/stickers/face/hot.png",
      "/stickers/face/crying.png",
    ],
  },
  {
    id: "nature",
    name: "자연",
    cover: "/stickers/nature/cactus.png",
    items: [
      "/stickers/nature/blossom.png",
      "/stickers/nature/cactus.png",
      "/stickers/nature/deciduous_tree.png",
      "/stickers/nature/evergreen_tree.png",
      "/stickers/nature/four_leaf_clover.png",
      "/stickers/nature/herb.png",
      "/stickers/nature/leaf_fluttering_in_wind.png",
      "/stickers/nature/lotus.png",
      "/stickers/nature/maple_leaf.png",
      "/stickers/nature/palm_tree.png",
      "/stickers/nature/potted_plant.png",
      "/stickers/nature/rose.png",
      "/stickers/nature/rosette.png",
      "/stickers/nature/sheaf_of_rice.png",
      "/stickers/nature/sunflower.png",
    ],
  },
  {
    id: "heart",
    name: "사랑",
    cover: "/stickers/heart/pink_heart.png",
    items: [
      "/stickers/heart/red_heart.png",
      "/stickers/heart/orange_heart.png",
      "/stickers/heart/yellow_heart.png",
      "/stickers/heart/green_heart.png",
      "/stickers/heart/blue_heart.png",
      "/stickers/heart/light_blue_heart.png",
      "/stickers/heart/purple_heart.png",
      "/stickers/heart/pink_heart.png",
      "/stickers/heart/brown_heart.png",
      "/stickers/heart/black_heart.png",
      "/stickers/heart/grey_heart.png",
      "/stickers/heart/white_heart.png",
      "/stickers/heart/beating_heart.png",
      "/stickers/heart/broken_heart.png",
      "/stickers/heart/heart_exclamation.png",
      "/stickers/heart/heart_on_fire.png",
      "/stickers/heart/mending_heart.png",
      "/stickers/heart/revolving_hearts.png",
      "/stickers/heart/sparkling_heart.png",
      "/stickers/heart/two_hearts.png",
    ],
  },
  {
    id: "animal",
    name: "동물",
    cover: "/stickers/animal/dog.png",
    items: [
      "/stickers/animal/bear.png",
      "/stickers/animal/cat.png",
      "/stickers/animal/cow.png",
      "/stickers/animal/dog.png",
      "/stickers/animal/fox.png",
      "/stickers/animal/frog.png",
      "/stickers/animal/hamster.png",
      "/stickers/animal/lion.png",
      "/stickers/animal/monkey.png",
      "/stickers/animal/mouse.png",
      "/stickers/animal/pig.png",
      "/stickers/animal/rabbit.png",
      "/stickers/animal/raccoon.png",
      "/stickers/animal/tiger.png",
      "/stickers/animal/wolf.png",
    ],
  },
  {
    id: "food",
    name: "음식",
    cover: "/stickers/food/rice_ball.png",
    items: [
      "/stickers/food/apple.png",
      "/stickers/food/banana.png",
      "/stickers/food/cherries.png",
      "/stickers/food/grapes.png",
      "/stickers/food/melon.png",
      "/stickers/food/strawberry.png",
      "/stickers/food/bagel.png",
      "/stickers/food/birthday_cake.png",
      "/stickers/food/cookie.png",
      "/stickers/food/doughnut.png",
      "/stickers/food/ice_cream.png",
      "/stickers/food/pretzel.png",
      "/stickers/food/rice_cracker.png",
      "/stickers/food/bacon.png",
      "/stickers/food/cheese_wedge.png",
      "/stickers/food/hamburger.png",
      "/stickers/food/meat_on_bone.png",
      "/stickers/food/pizza.png",
      "/stickers/food/rice_ball.png",
      "/stickers/food/sandwich.png",
      "/stickers/food/steaming_bowl.png",
    ],
  },
]

const withSofterBlack = (hex) =>
  String(hex || "").toLowerCase() === "#000000" ? "#333333" : (hex || "#ffffff");

// DataURL → File 변환 
function dataURLtoFile(dataURL, filename = "custom.png") {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

const ClothingCustomizer = () => {
  const navigate = useNavigate()
  const { darkMode } = useContext(ThemeContext)
  const fileInputRef = useRef(null)
  const previewContainerRef = useRef(null)
  const downloadCanvasRef = useRef(null)
  // *사용자, 초기 제품, 옵션 *
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  const products = [
    { id: 1, name: "반팔 티셔츠", image: "CustomImages/tee_short.png", category: "상의" },
    { id: 2, name: "긴팔 티셔츠", image: "CustomImages/tee_long.png", category: "상의" },
    { id: 3, name: "후드 티셔츠", image: "CustomImages/hoodie.png", category: "상의" },
    { id: 4, name: "긴팔 셔츠", image: "CustomImages/shirt.png", category: "상의" },
    { id: 5, name: "반바지", image: "CustomImages/short_pants.png", category: "하의" },
    { id: 6, name: "슬랙스", image: "CustomImages/long_pants.png", category: "하의" },
    { id: 7, name: "트레이닝 바지", image: "CustomImages/training_pants.png", category: "하의" },
    { id: 8, name: "치마", image: "CustomImages/skirt.png", category: "하의" },
  ]

  // 카테고리 분류 
  const categories = Array.from(new Set(products.map(p => p.category)));
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "상의");

  const [selectedProduct, setSelectedProduct] = useState({
    id: 1, name: "반팔 티셔츠", category: "top", image: "CustomImages/tee_short.png",
  })

  const productOptions = {
    // 의류 색상 팔레트 및 폰트 
    colors: [
      { name: "화이트", value: "#ffffff" },
      { name: "라이트 그레이", value: "#f3f4f6" },
      { name: "실버", value: "#d1d5db" },
      { name: "샌드", value: "#e5e7eb" },
      { name: "그레이", value: "#6b7280" },
      { name: "블랙", value: "#333333" },
      { name: "베이지", value: "#f5f5dc" },
      { name: "카멜", value: "#b45309" },
      { name: "브라운", value: "#7c3f1d" },
      { name: "라이트 레드", value: "#fee2e2" },
      { name: "레드", value: "#dc2626" },
      { name: "오렌지", value: "#f97316" },
      { name: "핫핑크", value: "#ec4899" },
      { name: "로즈", value: "#db2777" },
      { name: "앰버", value: "#f59e0b" },
      { name: "옐로우", value: "#eab308" },
      { name: "민트", value: "#a7f3d0" },
      { name: "그린", value: "#16a34a" },
      { name: "포레스트", value: "#166534" },
      { name: "틸", value: "#0d9488" },
      { name: "스카이 블루", value: "#93c5fd" },
      { name: "블루", value: "#3b82f6" },
      { name: "네이비", value: "#1e3a8a" },
      { name: "라일락", value: "#c4b5fd" },
      { name: "퍼플", value: "#9333ea" },
    ],
    fonts: [
      "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Trebuchet MS", "Tahoma", "Courier New", "Comic Sans MS", "Impact", "Malgun Gothic", "Apple SD Gothic Neo", "Nanum Gothic", "Nanum Myeongjo",
      "Noto Sans KR", "Noto Serif KR", "Spoqa Han Sans Neo", "Pretendard", "Roboto", "Open Sans", "Inter", "Lato", "Montserrat", "Poppins", "IBM Plex Sans", "Source Sans 3", "Nunito", "Quicksand",
      "Merriweather", "Playfair Display", "Oswald", "Fira Sans",
    ],
  }

  const [customization, setCustomization] = useState({
    color: "#ffffff",
    size: "M",
    material: "cotton",
  })

  // 레이어 및 선택 
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [layerIdCounter, setLayerIdCounter] = useState(1)
  const selectedTextLayer = layers.find(l => l.id === selectedLayerId && l.type === "text");
  // 드래그/뷰 제어
  const [isDragging, setIsDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState(null); // 리사이즈 설정(텍스트,로고 크기)
  const [zoom, setZoom] = useState(100) // 확대, 축소 줌 상태
  // 탭/히스토리/로딩
  const [activeTab, setActiveTab] = useState("color")
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  // 저장 확인 모달
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmImage, setConfirmImage] = useState(null);
  const [confirmName, setConfirmName] = useState("");
  const [confirmSaving, setConfirmSaving] = useState(false);
  // 스티커 모달 상태
  const [stickerModalOpen, setStickerModalOpen] = useState(false)
  const [stickerActiveCat, setStickerActiveCat] = useState(null)

  // ** 인증 및 초기화 **
  useEffect(() => {
    const init = async () => {
      if (!isLoggedIn()) {
        alert("로그인이 필요합니다.")
        navigate("/login")
        return
      }
      const user = getCurrentUser()
      setUserData(user)
      setLoading(false)
      const initial = { customization, layers: [] }
      setHistory([initial])
      setHistoryIndex(0)
    }
    init()
  }, [navigate, customization])

  // ** 레이어 추가/삭제/이동/수정 **
  const addTextLayer = useCallback(() => {
    const newLayer = {
      id: layerIdCounter,
      type: "text",
      content: "새 텍스트",
      position: { x: 50, y: 30 + layers.length * 10 },
      style: {
        color: "#000000", fontSize: 16, fontFamily: "Arial",
        fontWeight: "normal", fontStyle: "normal", underline: false,
        strike: false, letterSpacing: 0, rotation: 0
      },
      visible: true,
    }
    setLayers((prev) => [...prev, newLayer])
    setLayerIdCounter((prev) => prev + 1)
    setSelectedLayerId(newLayer.id)
  }, [layerIdCounter, layers.length])

  const addLogoLayer = useCallback(
    (imageData) => {
      const newLayer = {
        id: layerIdCounter,
        type: "logo",
        content: imageData,
        position: { x: 50, y: 50 },
        style: { size: 100 },
        visible: true,
      }
      setLayers((prev) => [...prev, newLayer])
      setLayerIdCounter((prev) => prev + 1)
      setSelectedLayerId(newLayer.id)
    },
    [layerIdCounter],
  )
  // 스티커 추가
  const addStickerLayer = useCallback((src) => {
    const newLayer = {
      id: layerIdCounter,
      type: "sticker",
      content: src,
      position: { x: 50, y: 50 },
      style: { size: 110 },
      visible: true,
    }
    setLayers(prev => [...prev, newLayer])
    setLayerIdCounter(prev => prev + 1)
    setSelectedLayerId(newLayer.id)
  }, [layerIdCounter])

  const openStickerModal = useCallback(() => {
    setStickerModalOpen(true);
    setStickerActiveCat(null);
  }, []);

  const closeStickerModal = useCallback(() => setStickerModalOpen(false), []);
  const enterStickerCategory = useCallback((catId) => setStickerActiveCat(catId), []);
  const backStickerCategories = useCallback(() => setStickerActiveCat(null), []);

  const pickSticker = useCallback((src) => {
    addStickerLayer(src);
    setStickerModalOpen(false);
  }, [addStickerLayer]);

  useEffect(() => {
    document.body.style.overflow = stickerModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [stickerModalOpen]);

  const deleteLayer = useCallback(
    (layerId) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== layerId))
      if (selectedLayerId === layerId) setSelectedLayerId(null)
    },
    [selectedLayerId],
  )

  const moveLayer = useCallback((layerId, direction) => {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === layerId)
      if (i === -1) return prev
      const j = direction === "up" ? i + 1 : i - 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
        ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  const updateLayer = useCallback((layerId, updates) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...updates } : l)))
  }, [])

  // ** 히스토리 (되돌리기, 앞으로가기) ** 
  const saveToHistory = useCallback(() => {
    const snapshot = { customization, layers }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      trimmed.push(snapshot)
      setHistoryIndex(trimmed.length - 1)
      return trimmed
    })
  }, [customization, layers, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setCustomization(prev.customization)
      setLayers(prev.layers)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setCustomization(next.customization)
      setLayers(next.layers)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex])

  // ** 제품 선택/ 파일 업로드 **
  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product)
    const reset = { color: "#ffffff", size: "M", material: "cotton" }
    setCustomization(reset)
    setLayers([])
    setSelectedLayerId(null)
    setHistory([{ customization: reset, layers: [] }])
    setHistoryIndex(0)
  }, [])

  const handleLogoUpload = useCallback(
    (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.")
        return
      }
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      if (!allowed.includes(file.type)) {
        alert("JPG/PNG/WEBP만 업로드 가능합니다.")
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => addLogoLayer(ev.target.result)
      reader.readAsDataURL(file)
    },
    [addLogoLayer],
  )

  // ** 드래그/리사이즈 **
  const handleDragStart = useCallback(
    (e, layerId) => {
      e.preventDefault()
      e.stopPropagation()
      if (!previewContainerRef.current) return

      const rect = previewContainerRef.current.getBoundingClientRect()
      const startX = e.clientX - rect.left
      const startY = e.clientY - rect.top
      const layer = layers.find((l) => l.id === layerId)
      if (!layer) return

      setIsDragging(layerId)
      setSelectedLayerId(layerId)

      const currentX = (layer.position.x / 100) * rect.width
      const currentY = (layer.position.y / 100) * rect.height
      setDragOffset({ x: startX - currentX, y: startY - currentY })
    },
    [layers],
  )

  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !previewContainerRef.current) return
      const rect = previewContainerRef.current.getBoundingClientRect()
      const currentX = e.clientX - rect.left - dragOffset.x
      const currentY = e.clientY - rect.top - dragOffset.y
      const percentX = Math.max(0, Math.min(100, (currentX / rect.width) * 100))
      const percentY = Math.max(0, Math.min(100, (currentY / rect.height) * 100))
      updateLayer(isDragging, { position: { x: percentX, y: percentY } })
    },
    [isDragging, dragOffset, updateLayer],
  )

  const handleDragEnd = useCallback(() => {
    if (isDragging) saveToHistory()
    setIsDragging(null)
    setDragOffset({ x: 0, y: 0 })
  }, [isDragging, saveToHistory])

  useEffect(() => {
    if (!isDragging) return
    const mm = (e) => handleDragMove(e)
    const mu = () => handleDragEnd()
    document.addEventListener("mousemove", mm)
    document.addEventListener("mouseup", mu)
    return () => {
      document.removeEventListener("mousemove", mm)
      document.removeEventListener("mouseup", mu)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // 리사이즈 시작
  const startResize = useCallback((e, layer, corner) => {
    e.preventDefault();
    e.stopPropagation();

    const isSizeType = layer.type === "logo" || layer.type === "sticker";

    setResizing({
      id: layer.id,
      type: layer.type,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startSize: isSizeType ? (layer.style?.size ?? 100) : null,
      startFont: layer.type === "text" ? (layer.style.fontSize || 16) : null,
    });
  }, []);
  // 리사이즈 진행
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      // 줌 보정
      const scale = (zoom || 100) / 100;
      const dx = (e.clientX - resizing.startX) / scale;
      const dy = (e.clientY - resizing.startY) / scale;
      const signX = resizing.corner.includes("w") ? -1 : 1;
      const signY = resizing.corner.includes("n") ? -1 : 1;
      const delta = (signX * dx + signY * dy) / 2;

      if (resizing.type === "text") {
        const next = Math.max(8, Math.round((resizing.startFont ?? 16) + delta * 0.6));
        setLayers(prev =>
          prev.map(l => l.id === resizing.id ? { ...l, style: { ...l.style, fontSize: next } } : l)
        );
      } else if (resizing.type === "logo" || resizing.type === "sticker") { // ✅ 스티커도 동일 처리
        const next = Math.max(20, Math.round((resizing.startSize ?? 100) + delta));
        setLayers(prev =>
          prev.map(l => l.id === resizing.id ? { ...l, style: { ...l.style, size: next } } : l)
        );
      }
    };
    const onUp = () => { setResizing(null); saveToHistory(); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing, setLayers, saveToHistory, zoom]);

  // * 레이어 선택 해제 함수 (빈 곳 클릭시)
  const handlePreviewMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const layerHitSelector = `.${styles.textOverlay}, .${styles.layerBox}, .${styles.logoOverlay}, .${styles.handle}`;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest(layerHitSelector)) {
      setSelectedLayerId(null);
    }
  }, [setSelectedLayerId]);

  // Delete(또는 Backspace)로 선택 레이어 삭제
  useEffect(() => {
    const onKeyDown = (e) => {
      if (selectedLayerId == null) return;
      const ae = document.activeElement;
      const tag = ae?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || ae?.isContentEditable;
      if (isTyping) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLayer(selectedLayerId);
        setTimeout(() => saveToHistory(), 0);
      } else if (e.key === "Escape") {
        setSelectedLayerId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedLayerId, deleteLayer, saveToHistory, setSelectedLayerId]);

  // *렌더링: 미리보기 그대로 합성(DataURL) / 로컬 다운로드
  // 미리보기와 동일한 배치로 최종 이미지 합성 → DataURL 반환
  const renderCompositeAsDataURL = useCallback(async () => {
    const root = previewContainerRef.current;
    if (!root) throw new Error("previewContainerRef is null");

    // 확대/축소 영향 없는 '논리 크기' 기준
    const baseW = Math.max(1, Math.round(root.offsetWidth));
    const baseH = Math.max(1, Math.round(root.offsetHeight));

    // 해상도 스케일(원하면 3으로 올려도 됨)
    const scale = 2;

    const canvas = document.createElement("canvas");
    canvas.width = baseW * scale;
    canvas.height = baseH * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 웹폰트가 있다면 로딩 대기(두께/폭 차이 방지)
    try { await document.fonts?.ready } catch { }

    // 의류 이미지 로드
    const garmentImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = selectedProduct.image;
    });

    // contain + center 사각형 계산(미리보기와 동일)
    const imgAR = garmentImg.naturalWidth / garmentImg.naturalHeight;
    const baseAR = baseW / baseH;
    let dW, dH, dx, dy;
    if (imgAR > baseAR) {
      dW = baseW; dH = baseW / imgAR; dx = 0; dy = (baseH - dH) / 2;
    } else {
      dH = baseH; dW = baseH * imgAR; dx = (baseW - dW) / 2; dy = 0;
    }

    // 의류 그리기
    ctx.drawImage(garmentImg, dx, dy, dW, dH);

    // 색상 틴트(곱연산)
    const withSofterBlack = (hex) => String(hex || "").toLowerCase() === "#000000" ? "#333333" : (hex || "#ffffff");
    const tintColor = withSofterBlack(customization.color || "#ffffff");
    if (tintColor.toLowerCase() !== "#ffffff") {
      const tint = document.createElement("canvas");
      tint.width = baseW; tint.height = baseH;
      const tctx = tint.getContext("2d");
      tctx.fillStyle = tintColor;
      tctx.fillRect(dx, dy, dW, dH);
      tctx.globalCompositeOperation = "destination-in";
      tctx.drawImage(garmentImg, dx, dy, dW, dH);
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(tint, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }

    // 레이어(텍스트/로고)
    for (const layer of layers) {
      if (!layer.visible) continue;
      const x = Math.round((layer.position.x / 100) * baseW);
      const y = Math.round((layer.position.y / 100) * baseH);

      if (layer.type === "text") {
        const st = layer.style || {};
        const fontPx = Math.round(st.fontSize || 16);
        const weight = st.fontWeight || "normal";
        const italic = st.fontStyle === "italic" ? "italic " : "";
        const color = st.color || "#000000";
        const letter = Math.round(st.letterSpacing || 0);
        const rot = (st.rotation || 0) * Math.PI / 180;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.textBaseline = "middle";
        ctx.font = `${italic}${weight} ${fontPx}px ${st.fontFamily || "Arial"}`;

        const text = layer.content ?? "";
        const measures = [...text].map(ch => ctx.measureText(ch).width);
        const totalW = measures.reduce((a, b) => a + b, 0) + Math.max(0, text.length - 1) * letter;
        let cursor = -totalW / 2;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          ctx.fillText(ch, Math.round(cursor), 0);
          cursor += measures[i] + letter;
        }

        // 밑줄/취소선
        if (st.underline || st.strike) {
          const thickness = Math.max(1, Math.round(fontPx / 15));
          ctx.strokeStyle = color;
          ctx.lineWidth = thickness;
          const startX = Math.round(-totalW / 2);
          const endX = Math.round(totalW / 2);
          if (st.underline) {
            const uy = Math.round(fontPx * 0.35);
            ctx.beginPath(); ctx.moveTo(startX, uy); ctx.lineTo(endX, uy); ctx.stroke();
          }
          if (st.strike) {
            const sy = Math.round(-fontPx * 0.05);
            ctx.beginPath(); ctx.moveTo(startX, sy); ctx.lineTo(endX, sy); ctx.stroke();
          }
        }
        ctx.restore();
      }

      if (layer.type === "logo" || layer.type === "sticker") {
        const logoImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = layer.content;
        });
        const w = Math.round(layer.style.size || 100);
        const ar = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1);
        const h = Math.round(w / ar);
        ctx.save();
        ctx.translate(x, y);
        const rot = ((layer.style?.rotation || 0) * Math.PI) / 180; // 로고 회전도 쓰면 반영
        ctx.rotate(rot);
        ctx.drawImage(logoImg, Math.round(-w / 2), Math.round(-h / 2), w, h);
        ctx.restore();
      }
    }

    return canvas.toDataURL("image/png", 1.0);
  }, [customization, layers, selectedProduct, previewContainerRef]);

  // * png 다운로드(외부 로컬 저장)
  const handleDownload = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1) 미리보기 컨테이너 실제 크기(줌/스케일 무시: layout 크기)를 기준으로
      const baseW = Math.max(1, Math.round(previewContainerRef.current?.offsetWidth || 400));
      const baseH = Math.max(1, Math.round(previewContainerRef.current?.offsetHeight || 400));

      // 고해상도 스케일(원하면 3~4로 조절)
      const scale = 3;

      const canvas = document.createElement("canvas");
      canvas.width = baseW * scale;
      canvas.height = baseH * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      try { await document.fonts?.ready } catch { }
      // 2) 의류 이미지 로드 
      const garmentImg = await new Promise((resolve, reject) => {
        const img = new Image();
        // 번들(import) 이미지면 crossOrigin 불필요, 외부 URL이면 필요할 수 있음
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = selectedProduct.image;
      });
      // 3) 미리보기와 동일한 contain 로직으로 그릴 사각형 계산
      const imgAR = garmentImg.naturalWidth / garmentImg.naturalHeight;
      const baseAR = baseW / baseH;
      let dW, dH, dx, dy;
      if (imgAR > baseAR) {
        // 이미지가 더 가로로 길다 → 너비 맞추고 세로 레터박스
        dW = baseW;
        dH = baseW / imgAR;
        dx = 0;
        dy = (baseH - dH) / 2;
      } else {
        // 이미지가 세로로 길다/정사각 → 높이 맞추고 가로 레터박스
        dH = baseH;
        dW = baseH * imgAR;
        dx = (baseW - dW) / 2;
        dy = 0;
      }
      // 4) 의류 그리기 (미리보기와 같은 위치/크기)
      ctx.drawImage(garmentImg, dx, dy, dW, dH);
      // 5) 색상 틴트: 의류 알파에만, 곱연산
      const tintColor = withSofterBlack(customization.color || "#ffffff");
      if (tintColor.toLowerCase() !== "#ffffff") {
        const tint = document.createElement("canvas");
        tint.width = baseW;
        tint.height = baseH;
        const tctx = tint.getContext("2d");

        // 색은 의류가 차지하는 영역(rect)만 채움
        tctx.fillStyle = tintColor;
        tctx.fillRect(dx, dy, dW, dH);

        // 의류 알파로 마스킹 (미리보기의 mask-image와 동일 효과)
        tctx.globalCompositeOperation = "destination-in";
        tctx.drawImage(garmentImg, dx, dy, dW, dH);

        // 메인 캔버스에 multiply 합성
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(tint, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      }
      // 6) 텍스트/로고 스티커 레이어: 미리보기와 동일한 기준(컨테이너 %)로 배치
      for (const layer of layers) {
        if (!layer.visible) continue;
        const x = (layer.position.x / 100) * baseW;
        const y = (layer.position.y / 100) * baseH;

        if (layer.type === "text") {
          const text = layer.content ?? "";
          const st = layer.style || {};
          const fontPx = Math.round(st.fontSize || 16);
          const weight = st.fontWeight || "normal";
          const italic = st.fontStyle === "italic" ? "italic " : "";
          const color = st.color || "#000000";
          const letter = Math.round(st.letterSpacing || 0);
          const rot = (st.rotation || 0) * Math.PI / 180;

          // 웹폰트가 있다면 앞서 document.fonts.ready를 기다렸는지 확인
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.fillStyle = color;
          ctx.textBaseline = "middle";
          ctx.font = `${italic}${weight} ${fontPx}px ${st.fontFamily || "Arial"}`;

          // letter-spacing 반영: 글자 단위로 측정/그리기
          const measures = [...text].map(ch => ctx.measureText(ch).width);
          const totalW = measures.reduce((a, b) => a + b, 0) + Math.max(0, text.length - 1) * letter;
          let cursor = -totalW / 2;

          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            ctx.fillText(ch, Math.round(cursor), 0);
            cursor += measures[i] + letter;
          }

          // 밑줄/취소선
          if (st.underline || st.strike) {
            const thickness = Math.max(1, Math.round(fontPx / 15));
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            const startX = Math.round(-totalW / 2);
            const endX = Math.round(totalW / 2);

            if (st.underline) {
              const uy = Math.round(fontPx * 0.35);
              ctx.beginPath(); ctx.moveTo(startX, uy); ctx.lineTo(endX, uy); ctx.stroke();
            }
            if (st.strike) {
              const sy = Math.round(-fontPx * 0.05);
              ctx.beginPath(); ctx.moveTo(startX, sy); ctx.lineTo(endX, sy); ctx.stroke();
            }
          }
          ctx.restore();
        } else if (layer.type === "logo" || layer.type === "sticker") {
          const logoImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = layer.content;
          });
          // 원본 비율 유지 (미리보기 동일하게)
          const w = Math.round(layer.style.size || 100)
          const ar = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1);
          const h = Math.round(w / ar)
          ctx.drawImage(logoImg, Math.round(x - w / 2), Math.round(y - h / 2), w, h)
        }
      }
      // 7) 저장
      const url = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = url;
      a.download = `custom-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.alert("이미지가 다운로드되었습니다.");
    } catch (e) {
      console.error(e);
      window.alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [customization, layers, selectedProduct, previewContainerRef]);

  // * 모달 최종 저장 
  const handleConfirmSubmit = useCallback(async () => {
    if (!confirmName.trim()) {
      window.alert("커스텀 이름을 입력해 주세요.");
      return;
    }
    try {
      setConfirmSaving(true);
      const file = dataURLtoFile(confirmImage, `custom-${Date.now()}.png`);
      await createCustomClothing(confirmName.trim(), file);
      window.alert("저장되었습니다!");
      setConfirmOpen(false);
      navigate("/mypage");
    } catch (e) {
      console.error(e);
      window.alert("저장 중 오류가 발생했습니다.");
    } finally {
      setConfirmSaving(false);
    }
  }, [confirmName, confirmImage, navigate]);

  useEffect(() => {
    // 모달 열릴 때 바디 스크롤 잠금
    if (confirmOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [confirmOpen]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmOpen(false);
      if (e.key === "Enter") handleConfirmSubmit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmOpen, handleConfirmSubmit]);

  // * 저장 버튼 
  const handleSave = useCallback(async () => {
    try {
      if (!isLoggedIn()) {
        window.alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      setIsLoading(true);
      const dataURL = await renderCompositeAsDataURL(); // 미리보기 그대로 합성
      setConfirmImage(dataURL);
      setConfirmName(`내가 디자인한 ${selectedProduct.name}`);
      setConfirmOpen(true); // ✅ 모달 열기 
    } catch (e) {
      console.error(e);
      window.alert("미리보기 이미지를 준비하는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, navigate, renderCompositeAsDataURL, selectedProduct.name]);

  // * 공유, 초기화
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `내가 디자인한 ${selectedProduct.name}`, text: "내 디자인 보기", url: window.location.href })
      } catch { }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("링크가 복사되었습니다.")
    }
  }, [selectedProduct.name])

  const handleReset = useCallback(() => {
    if (!window.confirm("모든 커스터마이징을 초기화할까요?")) return
    const reset = { color: "#ffffff", size: "M", pattern: null, material: "cotton" }
    setCustomization(reset)
    setLayers([])
    setSelectedLayerId(null)
    setHistory([{ customization: reset, layers: [] }])
    setHistoryIndex(0)
  }, [])

  // === UI=== //
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
            {/* 헤더 */}
            <section className={styles.headerSection}>
              <div className={styles.headerContent}>
                <div className={styles.titleArea}>
                  <h1 className={styles.pageTitle}>의류 커스터마이징</h1>
                  <p className={styles.pageDescription}>지금 바로 나만의 의류를 커스텀하세요</p>
                </div>

                <div className={styles.headerActions}>
                  <button onClick={handleShare} className={styles.actionButton} title="공유">
                    <Share2 size={18} />
                  </button>
                  <button onClick={handleSave} disabled={isLoading} className={`${styles.saveButton} ${isLoading ? styles.loading : ""}`}>
                    <Save size={18} />
                    {isLoading ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.productSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>제품 선택</h2>
                <div className={styles.categoryChips}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.chip} ${selectedCategory === cat ? styles.active : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.productGrid}>
                {products
                  .filter((p) => p.category === selectedCategory)
                  .map((product) => (
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
              {/* 미리보기 */}
              <div className={styles.previewSection}>
                <div className={styles.previewHeader}>
                  <h2 className={styles.sectionTitle}>미리보기</h2>
                  <div className={styles.previewControls}>
                    <div className={styles.zoomControls}>
                      <button onClick={() => setZoom(Math.max(50, zoom - 25))} className={styles.zoomButton} disabled={zoom <= 50}>
                        <ZoomOut size={16} />
                      </button>
                      <span className={styles.zoomLevel}>{zoom}%</span>
                      <button onClick={() => setZoom(Math.min(200, zoom + 25))} className={styles.zoomButton} disabled={zoom >= 200}>
                        <ZoomIn size={16} />
                      </button>
                    </div>

                    <div className={styles.historyControls}>
                      <button onClick={undo}
                        className={styles.zoomButton}
                        disabled={historyIndex <= 0}
                        title="뒤로 가기(실행 취소)">
                        <Undo size={16} />
                      </button>
                      <button onClick={redo}
                        className={styles.zoomButton}
                        disabled={historyIndex >= history.length - 1}
                        title="앞으로 가기(다시 실행)">
                        <Redo size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.previewCanvas}>
                  <div
                    className={styles.previewContainer}
                    style={{
                      transform: `scale(${(zoom / 100) * (BASE_ZOOM / 100)})`,
                      transformOrigin: "center center",
                      cursor: "default",
                    }}
                  >
                    <div ref={previewContainerRef} className={styles.clothingContainer} onMouseDown={handlePreviewMouseDown}>
                      <div
                        className={styles.garmentSurface}
                        style={{
                          // 1) 의류 알파를 마스크로 사용
                          WebkitMaskImage: `url(${selectedProduct.image})`,
                          maskImage: `url(${selectedProduct.image})`,
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",

                          // 2) 배경: 의류 사진 + (선택) 색상, 곱연산 블렌딩
                          backgroundImage: `url(${selectedProduct.image})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          backgroundColor: customization.color,
                          backgroundBlendMode: "multiply",
                        }}
                      >
                      </div>

                      {/* 숨김 캔버스 (필요 시 사용) */}
                      <canvas ref={downloadCanvasRef} style={{ display: "none" }} width={400} height={500} />

                      {/* 사용자 레이어(텍스트/로고) */}
                      {layers.map((layer) => {
                        if (!layer.visible) return null
                        if (layer.type === "text") {
                          return (
                            <div
                              key={layer.id}
                              className={`${styles.textOverlay} ${isDragging === layer.id ? styles.dragging : ""} ${selectedLayerId === layer.id ? styles.selected : ""}`}
                              style={{
                                left: `${layer.position.x}%`,
                                top: `${layer.position.y}%`,
                                color: layer.style.color,
                                fontSize: `${layer.style.fontSize}px`,
                                fontFamily: layer.style.fontFamily,
                                fontWeight: layer.style.fontWeight || "normal",
                                fontStyle: layer.style.fontStyle || "normal",
                                textDecoration: `${layer.style.underline ? "underline " : ""}${layer.style.strike ? "line-through" : ""}`.trim() || "none",
                                textAlign: "center",
                                letterSpacing: `${layer.style.letterSpacing || 0}px`,
                                transform: `translate(-50%, -50%) rotate(${layer.style.rotation || 0}deg)`,
                                cursor: "move",
                                transition: isDragging === layer.id ? "none" : "all 0.1s ease",
                                userSelect: "none",
                              }}
                              onMouseDown={(e) => handleDragStart(e, layer.id)}
                            >
                              {layer.content}
                              {selectedLayerId === layer.id && (
                                <div className={styles.resizeHandles}>
                                  {["nw", "ne", "sw", "se"].map(c => (
                                    <span
                                      key={c}
                                      className={`${styles.handle} ${styles[c]}`}
                                      onMouseDown={(e) => startResize(e, layer, c)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        }
                        if (layer.type === "logo") {
                          return (
                            <div
                              key={layer.id}
                              className={styles.layerBox}
                              style={{ left: `${layer.position.x}%`, top: `${layer.position.y}%` }}
                              onMouseDown={(e) => handleDragStart(e, layer.id)}
                            >
                              <img
                                src={layer.content || "/placeholder.svg"}
                                alt="logo"
                                className={styles.logoOverlay}
                                style={{ width: `${layer.style.size}px` }}
                                draggable={false}
                              />
                              {/* 선택됐을 때만 리사이즈 핸들 표시 */}
                              {selectedLayerId === layer.id && (
                                <div className={styles.resizeHandles}>
                                  {["nw", "ne", "sw", "se"].map((c) => (
                                    <span
                                      key={c}
                                      className={`${styles.handle} ${styles[c]}`}
                                      onMouseDown={(e) => startResize(e, layer, c)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        }
                        if (layer.type === "sticker") {
                          return (
                            <div
                              key={layer.id}
                              className={styles.layerBox}
                              style={{ left: `${layer.position.x}%`, top: `${layer.position.y}%` }}
                              onMouseDown={(e) => handleDragStart(e, layer.id)}
                            >
                              <img
                                src={layer.content}
                                alt="sticker"
                                className={styles.logoOverlay}
                                style={{ width: `${layer.style.size}px` }}
                                draggable={false}
                              />
                              {selectedLayerId === layer.id && (
                                <div className={styles.resizeHandles}>
                                  {["nw", "ne", "sw", "se"].map(c => (
                                    <span key={c} className={`${styles.handle} ${styles[c]}`} onMouseDown={(e) => startResize(e, layer, c)} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                </div>
                <div className={styles.productInfoCard}>
                  <h3 className={styles.productTitle}>{selectedProduct.name}</h3>
                  <p className={styles.productDescription}>의류 커스터마이징</p>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className={styles.customizationPanel}>
                <div className={styles.tabNavigation}>
                  {[
                    { id: "color", label: "색상", icon: Palette },
                    { id: "text", label: "텍스트", icon: Type },
                    { id: "sticker", label: "스티커", icon: ImageIcon },
                    { id: "logo", label: "이미지", icon: ImageIcon },
                    { id: "layers", label: "레이어", icon: Layers },
                  ].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={`${styles.tabButton} ${activeTab === id ? styles.active : ""}`}>
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
                {/* 색상 탭 */}
                <div className={styles.tabContent}>
                  {activeTab === "color" && (
                    <div className={styles.colorTab}>
                      <div className={styles.optionGroup}>
                        <h4 className={styles.optionTitle}>의류 색상</h4>
                        <div className={styles.colorGrid}>
                          {productOptions.colors.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => {
                                setCustomization({ ...customization, color: c.value })
                                saveToHistory()
                              }}
                              className={`${styles.colorOption} ${customization.color === c.value ? styles.selected : ""}`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            />
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
                      {selectedTextLayer && (
                        <>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              텍스트 내용
                              <input
                                type="text"
                                value={selectedTextLayer.content || ""}
                                onChange={(e) => updateLayer(selectedTextLayer.id, { content: e.target.value })}
                                onBlur={saveToHistory}
                                placeholder="텍스트를 입력하세요"
                                className={styles.textInput}
                              />
                            </label>
                          </div>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              서체 선택
                              <select
                                value={selectedTextLayer.style.fontFamily || "Arial"}
                                onChange={(e) =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, fontFamily: e.target.value },
                                  })
                                }
                                onBlur={saveToHistory}
                                className={styles.selectInput}
                              >
                                {productOptions.fonts.map((f) => (
                                  <option key={f} value={f} style={{ fontFamily: f }}>
                                    {f}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className={styles.optionGroup}>
                            <div className={styles.textToolbar}>
                              <button
                                type="button"
                                className={`${styles.toggleButton} ${selectedTextLayer.style.fontWeight === "bold" ? styles.active : ""}`}
                                onClick={() =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, fontWeight: selectedTextLayer.style.fontWeight === "bold" ? "normal" : "bold" },
                                  })
                                }
                                onBlur={saveToHistory}
                                title="굵게"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                className={`${styles.toggleButton} ${selectedTextLayer.style.fontStyle === "italic" ? styles.active : ""}`}
                                onClick={() =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, fontStyle: selectedTextLayer.style.fontStyle === "italic" ? "normal" : "italic" },
                                  })
                                }
                                onBlur={saveToHistory}
                                title="기울임"
                              >
                                <i>I</i>
                              </button>
                              <button
                                type="button"
                                className={`${styles.toggleButton} ${selectedTextLayer.style.underline ? styles.active : ""}`}
                                onClick={() =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, underline: !selectedTextLayer.style.underline },
                                  })
                                }
                                onBlur={saveToHistory}
                                title="밑줄"
                              >
                                U
                              </button>
                              <button
                                type="button"
                                className={`${styles.toggleButton} ${selectedTextLayer.style.strike ? styles.active : ""}`}
                                onClick={() =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, strike: !selectedTextLayer.style.strike },
                                  })
                                }
                                onBlur={saveToHistory}
                                title="취소선"
                              >
                                S
                              </button>
                            </div>
                          </div>
                          <div className={styles.optionGroup}>
                            <h4 className={styles.optionTitle}>글씨 색상</h4>
                            <div className={styles.swatchGrid}>
                              {TEXT_SWATCHES.map((hex) => (
                                <button
                                  key={hex}
                                  className={`${styles.swatch} ${selectedTextLayer.style.color === hex ? styles.selected : ""}`}
                                  style={{ background: hex }}
                                  onClick={() =>
                                    updateLayer(selectedTextLayer.id, { style: { ...selectedTextLayer.style, color: hex } })
                                  }
                                  onBlur={saveToHistory}
                                  title={hex}
                                />
                              ))}
                              <label
                                className={`${styles.swatch} ${styles.custom} ${/#[0-9a-f]{6}/i.test(selectedTextLayer.style.color || "") && !TEXT_SWATCHES.includes(selectedTextLayer.style.color) ? styles.selected : ""}`}
                                title="사용자 색상 선택"
                              >
                                <input
                                  type="color"
                                  value={selectedTextLayer.style.color || "#000000"}
                                  onChange={(e) =>
                                    updateLayer(selectedTextLayer.id, { style: { ...selectedTextLayer.style, color: e.target.value } })
                                  }
                                  onBlur={saveToHistory}
                                />
                                <span className={styles.customIndicator}>🎨</span>
                              </label>
                            </div>
                          </div>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              텍스트 크기: {selectedTextLayer.style.fontSize || 16}px
                              <input
                                type="range"
                                min="8"
                                max="100"
                                value={selectedTextLayer.style.fontSize || 16}
                                onChange={(e) =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, fontSize: parseInt(e.target.value, 10) },
                                  })
                                }
                                onMouseUp={saveToHistory}
                                className={styles.rangeInput}
                              />
                            </label>
                          </div>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              문자 간격: {selectedTextLayer.style.letterSpacing || 0}px
                              <input
                                type="range"
                                min="-2"
                                max="20"
                                value={selectedTextLayer.style.letterSpacing || 0}
                                onChange={(e) =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, letterSpacing: parseInt(e.target.value, 10) },
                                  })
                                }
                                onMouseUp={saveToHistory}
                                className={styles.rangeInput}
                              />
                            </label>
                          </div>
                          <div className={styles.optionGroup}>
                            <label className={styles.inputLabel}>
                              회전: {selectedTextLayer.style.rotation || 0}°
                              <input
                                type="range"
                                min="-90"
                                max="90"
                                value={selectedTextLayer.style.rotation || 0}
                                onChange={(e) =>
                                  updateLayer(selectedTextLayer.id, {
                                    style: { ...selectedTextLayer.style, rotation: parseInt(e.target.value, 10) },
                                  })
                                }
                                onMouseUp={saveToHistory}
                                className={styles.rangeInput}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* 스티커 탭 */}
                  {activeTab === "sticker" && (
                    <div className={styles.stickersTab}>
                      <div className={styles.optionGroup}>
                        <button className={styles.addButton} onClick={openStickerModal}>
                          <Plus size={16} /> 스티커 추가
                        </button>
                        <p className={styles.inputHint}>카테고리를 고른 뒤 스티커를 클릭하면 레이어로 추가됩니다.</p>
                      </div>
                      {selectedLayerId && layers.find(l => l.id === selectedLayerId && l.type === "sticker") && (
                        <div className={styles.optionGroup}>
                          <label className={styles.inputLabel}>
                            스티커 크기: {layers.find(l => l.id === selectedLayerId)?.style?.size ?? 100}px
                            <input
                              type="range"
                              min="35"
                              max="600"
                              step="1"
                              value={layers.find(l => l.id === selectedLayerId)?.style?.size ?? 100}
                              onChange={(e) => {
                                const next = parseInt(e.target.value, 10);
                                updateLayer(selectedLayerId, {
                                  style: { ...(layers.find(l => l.id === selectedLayerId)?.style || {}), size: next },
                                });
                              }}
                              onMouseUp={saveToHistory}
                              className={styles.rangeInput}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  {/* 로고(이미지 업로드) 탭 */}
                  {activeTab === "logo" && (
                    <div className={styles.logoTab}>
                      <div className={styles.optionGroup}>
                        <label className={styles.inputLabel}>
                          이미지 업로드
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className={styles.fileInput} />
                          <p className={styles.inputHint}>JPG, PNG, WEBP 파일 지원 (최대 5MB)</p>
                        </label>
                      </div>
                      {selectedLayerId && layers.find((l) => l.id === selectedLayerId && l.type === "logo") && (
                        <div className={styles.optionGroup}>
                          <label className={styles.inputLabel}>
                            이미지 크기: {layers.find((l) => l.id === selectedLayerId)?.style.size || 100}px
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={layers.find((l) => l.id === selectedLayerId)?.style.size || 100}
                              onChange={(e) =>
                                updateLayer(selectedLayerId, {
                                  style: { ...layers.find((l) => l.id === selectedLayerId)?.style, size: parseInt(e.target.value) },
                                })
                              }
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
                          {layers.map((l, idx) => (
                            <div
                              key={l.id}
                              className={`${styles.layerItem} ${selectedLayerId === l.id ? styles.selected : ""}`}
                              onClick={() => setSelectedLayerId(l.id)}
                            >
                              <div className={styles.layerInfo}>
                                <span className={styles.layerType}>{l.type === "text" ? <Type size={16} /> : <ImageIcon size={16} />}</span>
                                <span className={styles.layerName}>{l.type === "text" ? (l.content || "텍스트") : (l.type === "sticker" ? "스티커" : "이미지")} </span>
                              </div>
                              <div className={styles.layerControls}>
                                <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }) }} className={styles.layerButton} title={l.visible ? "숨기기" : "보이기"}>
                                  {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, "down") }} className={styles.layerButton} disabled={idx === 0} title="아래로">
                                  <ChevronDown size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, "up") }} className={styles.layerButton} disabled={idx === layers.length - 1} title="위로">
                                  <ChevronUp size={14} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id) }} className={`${styles.layerButton} ${styles.deleteButton}`} title="삭제">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {layers.length === 0 && (
                            <div className={styles.emptyLayers}>
                              <p>레이어가 없습니다.</p>
                              <p>텍스트나 이미지를 추가해보세요!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  
                <div className={styles.actionButtons}>
                  <button onClick={handleDownload} className={styles.downloadButton}>
                    <Download size={20} />
                    이미지 다운로드
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
      {/* ===== 커스텀 이미지 저장 모달 ===== */}
      {confirmOpen && (
        <div
          className={`${styles.modalOverlay} ${darkMode ? 'dark-mode' : ''}`}
          onMouseDown={() => setConfirmOpen(false)}   
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${styles.modal} ${darkMode ? 'dark-mode' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}  
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>완성된 의류 미리보기</h3>
              <button className={styles.modalClose} onClick={() => setConfirmOpen(false)} aria-label="닫기">✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalPreview}>
                <img src={confirmImage} alt="미리보기" />
              </div>

              <label className={styles.modalLabel}>
                커스텀 이름
                <input
                  type="text"
                  className={styles.modalInput} t
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="예) 나만의 반팔 티"
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setConfirmOpen(false)} disabled={confirmSaving}>
                돌아가기
              </button>
              <button className={styles.primaryButton} onClick={handleConfirmSubmit} disabled={confirmSaving}>
                {confirmSaving ? "저장 중..." : "저장하고 마이페이지로"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== 스티커 선택 모달 ===== */}
      {stickerModalOpen && (
        <div
          className={`${styles.modalOverlay} ${darkMode ? 'dark-mode' : ''}`}
          onMouseDown={closeStickerModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${styles.modal} ${styles.pickerModal} ${darkMode ? 'dark-mode' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {stickerActiveCat
                  ? (STICKERS.find(c => c.id === stickerActiveCat)?.name || "스티커")
                  : "스티커 선택"}
              </h3>
              <button className={styles.modalClose} onClick={closeStickerModal} aria-label="닫기">✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* 카테고리 목록 */}
              {!stickerActiveCat && (
                <div className={styles.categoryGrid}>
                  {STICKERS.map((cat) => (
                    <button
                      key={cat.id}
                      className={styles.categoryCard}
                      onClick={() => enterStickerCategory(cat.id)}
                      title={cat.name}
                    >
                      <div className={styles.categoryThumb}>
                        <img src={cat.cover || cat.items[0]} alt={cat.name} />
                      </div>
                      <div className={styles.categoryName}>{cat.name}</div>
                    </button>
                  ))}
                </div>
              )}
              {/* 카테고리 안의 스티커들 */}
              {stickerActiveCat && (
                <div className={styles.stickerGrid}>
                  {STICKERS.find((c) => c.id === stickerActiveCat)?.items.map((src, i) => (
                    <button
                      key={`${stickerActiveCat}-${i}`}
                      className={styles.stickerCard}
                      onClick={() => pickSticker(src)}
                      title="스티커 추가"
                    >
                      <div className={styles.stickerThumb}>
                        <img src={src} alt={`sticker-${i + 1}`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              {stickerActiveCat ? (
                <button className={styles.secondaryButton} onClick={backStickerCategories}>카테고리로</button>
              ) : (
                <button className={styles.secondaryButton} onClick={closeStickerModal}>닫기</button>
              )}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}

export default ClothingCustomizer

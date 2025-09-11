"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { isLoggedIn, getCurrentUser } from "../../api/auth"
import { createCustomClothing } from "../../api/customClothingAPI"
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
import teeShortImage from "./images/tee_short2.png"
import teeLongImage from "./images/tee_long2.png"
import hoodieImage from "./images/hoodie2.png"

const ClothingCustomizer = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const previewContainerRef = useRef(null)
  const downloadCanvasRef = useRef(null)

  // 사용자
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // 제품 초기 상태 
  const [selectedProduct, setSelectedProduct] = useState({
    id: 1,
    name: "베이직 티셔츠",
    category: "top",
    image: teeShortImage, 
  })

  const [customization, setCustomization] = useState({
    color: "#ffffff",
    size: "M",
    material: "cotton",
  })

  // 레이어 시스템
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [layerIdCounter, setLayerIdCounter] = useState(1)

  // 드래그/뷰 제어
  const [isDragging, setIsDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 })

  const [activeTab, setActiveTab] = useState("color")
  const [zoom, setZoom] = useState(100) // 확대, 축소 줌 상태
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)

  const [resizing, setResizing] = useState(null); // 리사이즈 설정(텍스트,로고 크기)
  const BASE_ZOOM = 150; // 미리보기 기본 설정(크기) 
  const withSofterBlack = (hex) =>
  String(hex || "").toLowerCase() === "#000000" ? "#333333" : (hex || "#ffffff");

  // 텍스트 색상
  const TEXT_SWATCHES = [
  "#0f172a", "#6d28d9", "#16a34a", "#000000", "#ffffff",
  "#60a5fa", "#f59e0b", "#facc15", "#fecdd3", "#9ca3af",
  "#ef4444", "#a78bfa", "#14b8a6", "#22c55e", "#3b82f6",
  "#fde68a", "#6b7280", "#dcfce7", "#bfdbfe", "#f3f4f6",
];

  // 선택된 텍스트 레이어 헬퍼
  const selectedTextLayer = layers.find(l => l.id === selectedLayerId && l.type === "text");

  // 옵션
  const productOptions = {
    colors: [
      { name: "화이트", value: "#ffffff" },
      { name: "블랙", value: "#333333" },
      { name: "네이비", value: "#1e3a8a" },
      { name: "그레이", value: "#6b7280" },
      { name: "레드", value: "#dc2626" },
      { name: "그린", value: "#16a34a" },
      { name: "옐로우", value: "#eab308" },
      { name: "퍼플", value: "#9333ea" },
      { name: "핑크", value: "#ec4899" },
      { name: "오렌지", value: "#f97316" },
    ],
    fonts: ["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", 
      "Comic Sans MS", "Impact", "Trebuchet MS", "Roboto", "Open Sans"],
  }

  // 제품 목록 + 추가 예정
  const products = [
    { id: 1, name: "반팔 티셔츠", image: teeShortImage, category: "상의" },
    { id: 2, name: "긴팔 티셔츠", image: teeLongImage, category: "상의" },
    { id: 3, name: "후드 티셔츠", image: hoodieImage, category: "상의" }
  ]

  // ---------- 레이어 유틸 ----------
  const addTextLayer = useCallback(() => {
    const newLayer = {
      id: layerIdCounter,
      type: "text",
      content: "새 텍스트",
      position: { x: 50, y: 30 + layers.length * 10 },
      style: { color: "#000000", fontSize: 16, fontFamily: "Arial",
              fontWeight: "normal", fontStyle: "normal", underline: false,
              strike: false, letterSpacing: 0, rotation: 0},
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

  const saveToHistory = useCallback(() => {
    const snapshot = { customization, layers }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      trimmed.push(snapshot)
      setHistoryIndex(trimmed.length - 1)
      return trimmed
    })
  }, [customization, layers, historyIndex])

  // ---------- 드래그 ----------
  const handleDragStart = useCallback(
    (e, layerId) => {
      e.preventDefault()
      e.stopPropagation()
      if (!previewContainerRef.current) return

      if (e.shiftKey || isPanMode) {
        const rect = previewContainerRef.current.getBoundingClientRect()
        setPanStartPos({ x: e.clientX - rect.left - panOffset.x, y: e.clientY - rect.top - panOffset.y })
        setIsDragging("pan")
        return
      }

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
    [layers, isPanMode, panOffset],
  )

  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !previewContainerRef.current) return
      const rect = previewContainerRef.current.getBoundingClientRect()

      if (isDragging === "pan") {
        setPanOffset({ x: e.clientX - rect.left - panStartPos.x, y: e.clientY - rect.top - panStartPos.y })
        return
      }

      const currentX = e.clientX - rect.left - dragOffset.x
      const currentY = e.clientY - rect.top - dragOffset.y
      const percentX = Math.max(0, Math.min(100, (currentX / rect.width) * 100))
      const percentY = Math.max(0, Math.min(100, (currentY / rect.height) * 100))
      updateLayer(isDragging, { position: { x: percentX, y: percentY } })
    },
    [isDragging, dragOffset, panStartPos, updateLayer],
  )

  const handleDragEnd = useCallback(() => {
    if (isDragging && isDragging !== "pan") saveToHistory()
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
  
  // 리사이즈 
  const startResize = useCallback((e, layer, corner) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      id: layer.id,
      type: layer.type,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startSize: layer.type === "logo" ? (layer.style.size || 100) : null,
      startFont: layer.type === "text" ? (layer.style.fontSize || 16) : null,
    });
  }, []);

  useEffect(() => {
  if (!resizing) return;

  const onMove = (e) => {
    // 줌 상태 보정(줌이 클수록 덜 민감)
    const scale = (zoom || 100) / 100;
    const dx = (e.clientX - resizing.startX) / scale;
    const dy = (e.clientY - resizing.startY) / scale;

    const signX = resizing.corner.includes("w") ? -1 : 1;
    const signY = resizing.corner.includes("n") ? -1 : 1;
    const delta = (signX * dx + signY * dy) / 2; // 대각선 기준 변화량

    if (resizing.type === "logo") {
      const next = Math.max(20, Math.round(resizing.startSize + delta));
      setLayers(prev =>
        prev.map(l => l.id === resizing.id ? { ...l, style: { ...l.style, size: next } } : l)
      );
    } else { // text
      const next = Math.max(8, Math.round(resizing.startFont + delta * 0.6));
      setLayers(prev =>
        prev.map(l => l.id === resizing.id ? { ...l, style: { ...l.style, fontSize: next } } : l)
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

  // 레이어가 아닌 곳을 클릭했을 때 선택 해제
  const handlePreviewMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // 좌클릭만
    const layerHitSelector = `.${styles.textOverlay}, .${styles.layerBox}, .${styles.logoOverlay}, .${styles.handle}`;
    const t = e.target;
    if (!(t instanceof Element)) return;

    // 클릭 대상이 레이어(텍스트/로고/핸들) 내부가 아니면 선택 해제
    if (!t.closest(layerHitSelector)) {
      setSelectedLayerId(null);
    }
  }, [setSelectedLayerId]);

  // ⌨️ Delete(또는 Backspace)로 선택 레이어 삭제
  useEffect(() => {
    const onKeyDown = (e) => {
      if (selectedLayerId == null) return;

      // 입력 중일 땐(텍스트 입력칸·색상·파일 등) 삭제 동작 막음
      const ae = document.activeElement;
      const tag = ae?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || ae?.isContentEditable;
      if (isTyping) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLayer(selectedLayerId);
        // 상태 반영 뒤 히스토리 스냅샷 저장 (렌더 후 실행)
        setTimeout(() => saveToHistory(), 0);
      } else if (e.key === "Escape") {
        // Esc로 선택 해제(선택)
        setSelectedLayerId(null);
      }
    };

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [selectedLayerId, deleteLayer, saveToHistory, setSelectedLayerId]);


  // ---------- 인증 & 초기화 ----------
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

  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product)
    const reset = { color: "#ffffff", size: "M", material: "cotton" }
    setCustomization(reset)
    setLayers([])
    setSelectedLayerId(null)
    setHistory([{ customization: reset, layers: [] }])
    setHistoryIndex(0)
  }, [])

  // ---------- 파일 업로드 ----------
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

  // ---------- 캔버스 다운로드 (투명 의류 이미지 기준) ----------
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
    
    try { await document.fonts?.ready } catch {}
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
    // 6) 텍스트/로고 레이어: 미리보기와 동일한 기준(컨테이너 %)로 배치
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
        if (st.underline || st.strike){
          const thickness = Math.max(1, Math.round(fontPx/15));
          ctx.strokeStyle = color;
          ctx.lineWidth = thickness;
          const startX = Math.round(-totalW/2);
          const endX   = Math.round( totalW/2);

          if (st.underline){
            const uy = Math.round(fontPx * 0.35);
            ctx.beginPath(); ctx.moveTo(startX, uy); ctx.lineTo(endX, uy); ctx.stroke();
          }
          if (st.strike){
            const sy = Math.round(-fontPx * 0.05);
            ctx.beginPath(); ctx.moveTo(startX, sy); ctx.lineTo(endX, sy); ctx.stroke();
          }
        }
        ctx.restore();
        } else if (layer.type === "logo") {
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

  // 저장/공유/초기화
  const handleSave = useCallback(async () => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.")
      navigate("/login")
      return
    }

    // 커스터마이징 이름 입력 받기
    const customName = prompt("커스터마이징 의류의 이름을 입력해주세요:", `내가 디자인한 ${selectedProduct.name}`)
    if (!customName || customName.trim() === "") {
      alert("커스터마이징 이름을 입력해주세요.")
      return
    }

    setIsLoading(true)
    try {
      // 캔버스에서 이미지 생성
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      
      // 고해상도로 설정
      const scale = 3
      const baseW = 400
      const baseH = 500
      canvas.width = baseW * scale
      canvas.height = baseH * scale
      ctx.scale(scale, scale)

      // 의류 이미지 로드
      const garmentImg = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = selectedProduct.image
      })

      // 의류 그리기
      const imgAR = garmentImg.naturalWidth / garmentImg.naturalHeight
      const baseAR = baseW / baseH
      let dW, dH, dx, dy
      if (imgAR > baseAR) {
        dW = baseW
        dH = baseW / imgAR
        dx = 0
        dy = (baseH - dH) / 2
      } else {
        dH = baseH
        dW = baseH * imgAR
        dx = (baseW - dW) / 2
        dy = 0
      }
      ctx.drawImage(garmentImg, dx, dy, dW, dH)

      // 색상 틴트 적용
      const tintColor = withSofterBlack(customization.color || "#ffffff")
      if (tintColor.toLowerCase() !== "#ffffff") {
        const tint = document.createElement("canvas")
        tint.width = baseW
        tint.height = baseH
        const tctx = tint.getContext("2d")
        tctx.fillStyle = tintColor
        tctx.fillRect(dx, dy, dW, dH)
        tctx.globalCompositeOperation = "destination-in"
        tctx.drawImage(garmentImg, dx, dy, dW, dH)
        ctx.globalCompositeOperation = "multiply"
        ctx.drawImage(tint, 0, 0)
        ctx.globalCompositeOperation = "source-over"
      }

      // 레이어 그리기
      for (const layer of layers) {
        if (!layer.visible) continue
        const x = (layer.position.x / 100) * baseW
        const y = (layer.position.y / 100) * baseH

        if (layer.type === "text") {
          const text = layer.content ?? ""
          const st = layer.style || {}
          const fontPx = Math.round(st.fontSize || 16)
          const weight = st.fontWeight || "normal"
          const italic = st.fontStyle === "italic" ? "italic " : ""
          const color = st.color || "#000000"
          const letter = Math.round(st.letterSpacing || 0)
          const rot = (st.rotation || 0) * Math.PI / 180

          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(rot)
          ctx.fillStyle = color
          ctx.textBaseline = "middle"
          ctx.font = `${italic}${weight} ${fontPx}px ${st.fontFamily || "Arial"}`

          const measures = [...text].map(ch => ctx.measureText(ch).width)
          const totalW = measures.reduce((a, b) => a + b, 0) + Math.max(0, text.length - 1) * letter
          let cursor = -totalW / 2

          for (let i = 0; i < text.length; i++) {
            const ch = text[i]
            ctx.fillText(ch, Math.round(cursor), 0)
            cursor += measures[i] + letter
          }

          if (st.underline || st.strike) {
            const thickness = Math.max(1, Math.round(fontPx/15))
            ctx.strokeStyle = color
            ctx.lineWidth = thickness
            const startX = Math.round(-totalW/2)
            const endX = Math.round(totalW/2)

            if (st.underline) {
              const uy = Math.round(fontPx * 0.35)
              ctx.beginPath()
              ctx.moveTo(startX, uy)
              ctx.lineTo(endX, uy)
              ctx.stroke()
            }
            if (st.strike) {
              const sy = Math.round(-fontPx * 0.05)
              ctx.beginPath()
              ctx.moveTo(startX, sy)
              ctx.lineTo(endX, sy)
              ctx.stroke()
            }
          }
          ctx.restore()
        } else if (layer.type === "logo") {
          const logoImg = await new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = layer.content
          })
          const w = Math.round(layer.style.size || 100)
          const ar = (logoImg.naturalWidth || 1) / (logoImg.naturalHeight || 1)
          const h = Math.round(w / ar)
          ctx.drawImage(logoImg, Math.round(x - w / 2), Math.round(y - h / 2), w, h)
        }
      }

      // 캔버스를 Blob으로 변환
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0)
      })

      // File 객체 생성
      const file = new File([blob], `${customName}.png`, { type: 'image/png' })

      // 서버에 저장
      const result = await createCustomClothing(customName.trim(), file)
      
      alert("커스터마이징 의류가 저장되었습니다!")
      console.log("저장된 커스터마이징 의류:", result)
      
    } catch (error) {
      console.error("저장 실패:", error)
      alert(`저장 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [customization, layers, selectedProduct, navigate])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `내가 디자인한 ${selectedProduct.name}`, text: "내 디자인 보기", url: window.location.href })
      } catch {}
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

  // UI 코드 
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

            {/* 제품 선택 */}
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
                      {/* 투명 배경 이미지는 배경이 그대로 비쳐 보임 */}
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

                    <button
                      onClick={() => setIsPanMode(!isPanMode)}
                      className={`${styles.overlayToggle} ${isPanMode ? styles.active : ""}`}
                      title="팬 모드 (Shift+드래그)"
                    >
                      <Move3D size={16} />팬 모드
                    </button>
                  </div>
                </div>

                <div className={styles.previewCanvas}>
                  <div
                    className={styles.previewContainer}
                    style={{transform: `scale(${(zoom / 100) * (BASE_ZOOM / 100)}) translate(${panOffset.x}px, ${panOffset.y}px)`, 
                    transformOrigin: "center center", cursor: isPanMode ? "grab" : "default" }}
                  >
                    {/* ✅ 여기서부터 '옷만' 보이게 */}
                    <div ref={previewContainerRef} className={styles.clothingContainer} onMouseDown={handlePreviewMouseDown}>
                      {/* 의류 사진 + 색상 틴트 + 마스크를 한 컨테이너에서 처리 */}
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
                                 {["nw","ne","sw","se"].map(c => (
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
                            {/* ✅ 선택됐을 때만 리사이즈 핸들 표시 */}
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
                      return null
                      })}

                      {/* 드래그 가이드 */}
                      {isDragging && isDragging !== "pan" && <div className={styles.dragGuide}>드래그하여 위치를 조정하세요</div>}
                    </div>
                  </div>

                  <div className={styles.rotationHint}>
                    <Move3D size={16} />
                    <span>Shift+드래그: 팬 | 요소 클릭: 이동</span>
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
                    { id: "logo", label: "이미지 업로드", icon: ImageIcon },
                    { id: "layers", label: "레이어", icon: Layers },
                  ].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={`${styles.tabButton} ${activeTab === id ? styles.active : ""}`}>
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>

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
                  {activeTab === "text" && (
                    <div className={styles.textTab}>
                      {/* 새 텍스트 추가 */}
                      <div className={styles.optionGroup}>
                        <button onClick={addTextLayer} className={styles.addButton}>
                          <Plus size={16} />새 텍스트 추가
                        </button>
                      </div>
                      {/* 선택된 텍스트가 있을 때만 세부 옵션 표시 */}
                      {selectedTextLayer && (
                        <>
                          {/* 내용 */}
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

                          {/* 폰트 선택 (기존 유지) */}
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

                          {/* 서체 스타일: 굵게/기울임/밑줄/취소선 */}
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
                          {/* 글씨 색상 팔레트 + 사용자 색상 */}
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

                              {/* 사용자 색상 */}
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

                          {/* 크기(기존) + 문자 간격 + 회전 */}
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
                                    style: {...selectedTextLayer.style, rotation: parseInt(e.target.value, 10) },
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


                  {activeTab === "logo" && (
                    <div className={styles.logoTab}>
                      <div className={styles.optionGroup}>
                        <label className={styles.inputLabel}>
                          이미지 업로드
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className={styles.fileInput} />
                          <span className={styles.inputHint}>JPG, PNG, WEBP 파일 지원 (최대 5MB)</span>
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
                                <span className={styles.layerName}>{l.type === "text" ? l.content || "텍스트" : "로고"}</span>
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
                              <p>텍스트나 로고를 추가해보세요!</p>
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

      <Footer />
    </div>
  )
}

export default ClothingCustomizer

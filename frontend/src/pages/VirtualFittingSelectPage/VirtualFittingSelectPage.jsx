"use client"

import { useEffect, useState, useContext } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import { ThemeContext } from "../../context/ThemeContext"
import { isLoggedIn } from "../../api/auth"
import { getFittingStatus, selectFittingResult } from "../../api/virtual_fitting"
import styles from "./VirtualFittingSelectPage.module.css"

const VirtualFittingSelectPage = () => {
  const { darkMode } = useContext(ThemeContext)
  const navigate = useNavigate()
  const { processId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [resultImages, setResultImages] = useState([])
  const [resultItems, setResultItems] = useState([])
  const [title, setTitle] = useState("")
  const [modelImageUrl, setModelImageUrl] = useState("")
  const [clothImageUrl, setClothImageUrl] = useState("")
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

  const toFullUrl = (path) => {
    if (!path) return ""
    if (typeof path !== 'string') return ""
    if (path.startsWith('http')) return path
    const trimmed = path.replace(/^\/+/, '')
    return `${API_BASE_URL}/${trimmed}`
  }

  useEffect(() => {
    const init = async () => {
      if (!isLoggedIn()) {
        navigate("/login")
        return
      }
      try {
        const status = await getFittingStatus(processId)
        if (status.status !== 'COMPLETED') {
          setError("아직 결과가 준비되지 않았습니다. 메인 페이지에서 상태를 확인하세요.")
        } else {
          // status.result_images는 백엔드에서 '/uploads/...' 정적 경로로 반환됨
          const images = Array.isArray(status.result_images) ? status.result_images : []
          setResultImages(images.map(u => toFullUrl(u)))
          const items = Array.isArray(status.result_items) ? status.result_items : []
          setResultItems(items.map(it => ({ index: it.index, url: toFullUrl(it.url) })))
          if (status.model_image_url) {
            setModelImageUrl(toFullUrl(status.model_image_url))
          }
          if (status.cloth_image_url) {
            setClothImageUrl(toFullUrl(status.cloth_image_url))
          }
        }
      } catch (e) {
        setError(e.message || "상태 조회 실패")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [processId, navigate])

  const handleSelect = async (indexOrZeroBased) => {
    try {
      // indexOrZeroBased는 UI상 0-based일 수 있으므로 resultItems를 통해 백엔드의 1-based index를 찾음
      let selectedIndex = indexOrZeroBased
      if (resultItems.length > 0) {
        const item = resultItems[indexOrZeroBased] || resultItems.find(it => it.index === indexOrZeroBased)
        if (item && typeof item.index === 'number') selectedIndex = item.index
      }
      if (!selectedIndex || selectedIndex < 1) selectedIndex = (indexOrZeroBased || 0) + 1
      await selectFittingResult(Number(processId), selectedIndex, title || null)
      alert("결과가 저장되었습니다.")
      navigate("/virtual-fitting-main")
    } catch (e) {
      alert(e.message || "저장 실패")
    }
  }

  return (
    <div className={`${styles.page} ${darkMode ? styles.darkMode : ""}`}>
      <Header />
      <div className={styles.container}>
        <h1>가상 피팅 결과 선택</h1>
        <p className={styles.helper}>결과 이미지를 선택하고 이름을 입력해 저장하세요.</p>

        {loading ? (
          <div className={styles.loading}>불러오는 중...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            <div className={styles.inputsRow}>
              <div className={styles.inputCard}>
                <div className={styles.inputLabel}>인물 이미지</div>
                {modelImageUrl ? (
                  <img className={styles.inputImage} src={modelImageUrl} alt="인물" />
                ) : (
                  <div className={styles.inputPlaceholder}>입력 이미지 정보 없음</div>
                )}
              </div>
              <div className={styles.inputCard}>
                <div className={styles.inputLabel}>의류 이미지</div>
                {clothImageUrl ? (
                  <img className={styles.inputImage} src={clothImageUrl} alt="의류" />
                ) : (
                  <div className={styles.inputPlaceholder}>입력 이미지 정보 없음</div>
                )}
              </div>
            </div>

            <div className={styles.titleRow}>
              <label className={styles.label}>결과 이름</label>
              <input
                className={styles.input}
                placeholder="예: 여름 셔츠 피팅"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.grid}>
              {resultImages.map((url, idx) => (
                <div key={idx} className={styles.item}>
                  <img
                    src={url}
                    alt={`결과 ${idx + 1}`}
                    className={styles.image}
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=200&width=150&text=이미지+없음"
                    }}
                  />
                  <button className={styles.selectBtn} onClick={() => handleSelect(idx)}>이 이미지로 저장</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default VirtualFittingSelectPage



"use client"

import { useContext } from "react"
import { ThemeContext } from "../context/ThemeContext"
import "../styles/ImagePlaceholder.css"

const ImagePlaceholder = ({ productName }) => {
  const { darkMode } = useContext(ThemeContext)

  // 제품명에서 첫 글자 또는 첫 단어 추출
  const getInitials = (name) => {
    if (!name) return "FG"

    // 영문인 경우 첫 글자들 추출
    if (/^[A-Za-z\s]+$/.test(name)) {
      return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase()
    }

    // 한글인 경우 첫 두 글자 추출
    return name.substring(0, 2)
  }

  const initials = getInitials(productName)

  return (
    <div className={`image-placeholder ${darkMode ? "dark" : "light"}`} aria-label={`${productName} 이미지 준비 중`}>
      <div className="placeholder-content">
        <span className="placeholder-initials">{initials}</span>
      </div>
      <div className="placeholder-brand">FASHION GUYS</div>
    </div>
  )
}

export default ImagePlaceholder

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"

export const useRecentProducts = () => {
  const { isAuthenticated } = useAuth()
  const [recentProducts, setRecentProducts] = useState([])

  // 컴포넌트 마운트 시 최근 본 상품 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadRecentProducts()
    } else {
      setRecentProducts([])
    }
  }, [isAuthenticated])

  const loadRecentProducts = () => {
    try {
      const storedRecentProducts = localStorage.getItem("recentProducts")
      if (storedRecentProducts) {
        const products = JSON.parse(storedRecentProducts)
        setRecentProducts(products)
      }
    } catch (error) {
      console.error("최근 본 상품 로드 오류:", error)
      setRecentProducts([])
    }
  }

  const addRecentProduct = (product) => {
    if (!isAuthenticated) return

    try {
      // 중복 제거 후 최신 상품을 맨 앞에 추가 (최대 3개)
      const updatedProducts = [product, ...recentProducts.filter((item) => item.id !== product.id)].slice(0, 3)

      setRecentProducts(updatedProducts)
      localStorage.setItem("recentProducts", JSON.stringify(updatedProducts))
    } catch (error) {
      console.error("최근 본 상품 추가 오류:", error)
    }
  }

  const clearRecentProducts = () => {
    setRecentProducts([])
    localStorage.removeItem("recentProducts")
  }

  return {
    recentProducts,
    addRecentProduct,
    clearRecentProducts,
    loadRecentProducts,
  }
}

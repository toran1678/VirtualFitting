"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { loginUser as apiLoginUser, logoutUser as apiLogoutUser, isLoggedIn, getCurrentUser } from "../api/auth"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // 초기 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // 로컬 스토리지 변경 감지 (다른 탭에서의 변경만 감지됨)
  useEffect(() => {
    const handleStorageChange = () => {
      checkAuthStatus()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const checkAuthStatus = () => {
    try {
      const loginStatus = isLoggedIn()
      setIsAuthenticated(loginStatus)

      if (loginStatus) {
        const userData = getCurrentUser()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("인증 상태 확인 오류:", error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      setLoading(true)
      const response = await apiLoginUser(credentials)

      // 로그인 성공 시 상태 즉시 업데이트
      const userData = getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)

      return response
    } catch (error) {
      console.error("로그인 오류:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await apiLogoutUser()

      // 로그아웃 성공 시 상태 즉시 초기화
      setUser(null)
      setIsAuthenticated(false)

      return true
    } catch (error) {
      console.error("로그아웃 오류:", error)
      // 서버 오류가 발생해도 로컬 상태는 초기화
      setUser(null)
      setIsAuthenticated(false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateUser = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    // 로컬 스토리지도 업데이트
    if (userData) {
      localStorage.setItem("user", JSON.stringify({ ...userData, isLoggedIn: true }))
    }
  }

  // 수동으로 상태를 새로고침하는 함수 추가
  const refreshAuth = () => {
    checkAuthStatus()
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

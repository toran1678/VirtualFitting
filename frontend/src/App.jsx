"use client"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import MainPage from "./pages/MainPage"
import RegisterPage from "./pages/RegisterPage"
import LoginPage from "./pages/LoginPage"
import "./App.css"

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/virtual-fitting" element={<div>Virtual Fitting Page (Coming Soon)</div>} />
          <Route path="/feed" element={<div>Feed Page (Coming Soon)</div>} />
          <Route path="/mypage" element={<div>My Page (Coming Soon)</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App

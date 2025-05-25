"use client"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider} from "./context/AuthContext"

// Importing pages
import MainPage from "./pages/MainPage"
import RegisterPage from "./pages/RegisterPage"
import LoginPage from "./pages/LoginPage"
import VirtualFittingPage from "./pages/VirtualFittingPage"
import "./App.css"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/virtual-fitting" element={<VirtualFittingPage />} />
            <Route path="/feed" element={<div>Feed Page (Coming Soon)</div>} />
            <Route path="/mypage" element={<div>My Page (Coming Soon)</div>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

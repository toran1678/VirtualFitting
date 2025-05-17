import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import MainPage from "./pages/MainPage.jsx"
import "./App.css"
import { ThemeProvider } from "./context/ThemeContext.jsx"


function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          {/* Add more routes as you develop them */}
          <Route path="/virtual-fitting" element={<div>Virtual Fitting Page (Coming Soon)</div>} />
          <Route path="/feed" element={<div>Feed Page (Coming Soon)</div>} />
          <Route path="/mypage" element={<div>My Page (Coming Soon)</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App;

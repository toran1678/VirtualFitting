import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import AboutPage from "../pages/About/AboutPage";
import StartPage from "../pages/Start/StartPage";
import TestPage from "../pages/Test/TestPage";

/*
* <BrowserRouter> 컴포넌트는 브라우저에서 사용되는 <Router> 컴포넌트
* <Routes> 여러 <Route> 컴포넌트를 포함하는 컨테이너
* <Route> 라우트를 정의하는 컴포넌트
*/
export default function Router() {
    return (
      <BrowserRouter>
        <nav>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " click" : "")} to='/'>
            Start
          </NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " click" : "")} to='/about'>
            About
          </NavLink>
          <NavLink className={({ isActive }) => "nav-link" + (isActive ? " click" : "")} to='/test'>
            Test
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/test" element={<TestPage />} />
        </Routes>
      </BrowserRouter>
    )
}
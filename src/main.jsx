import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// 1. Thêm 'Outlet' từ react-router-dom
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom"; 
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { UserProvider } from "./UserContext";
import { OwnerProvider } from "./OwnerContext";

import Navbar from "./navbar";
import OwnerNavbar from "./OwnerNavbar";
import Footer from "./footer";

// (Các trang của bạn)
import Hero from "./hero";
import CarList from "./carlist";
import Search from "./search";
import CarDetail from "./carDetail";
import UserProfile from "./UserProfile";
import ContractDetail from "./contractDetail";
import ContractView from "./ContractView";
import BeOwner from "./BeOwner";
import OwnerDashboard from "./OwnerDashboard";
import OwnerLoginModal from "./OwnerLoginModal";
import OwnerRegisterModal from "./OwnerRegisterModal";
import OwnerProfile from "./OwnerProfile";
import OwnerCars from "./OwnerCars";
import OwnerContracts from "./OwnerContracts";
import OwnerBranches from "./OwnerBranches";
import OwnerCalendar from "./OwnerCalendar";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

// === (MỚI) Định nghĩa các Component Bố cục ===

/**
 * Bố cục cho Khách hàng (có Navbar)
 * - Tự động đẩy footer xuống dưới cùng
 */
function CustomerLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Outlet /> {/* Các trang con (như Search, CarDetail) sẽ render ở đây */}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Bố cục cho Chủ xe (có OwnerNavbar)
 * - Tự động đẩy footer xuống dưới cùng
 */
function OwnerLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <OwnerNavbar />
      <main className="flex-grow-1">
        <Outlet /> {/* Các trang con (như OwnerCars, OwnerProfile) sẽ render ở đây */}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Bố cục cho Đăng nhập/Đăng ký (Không Navbar)
 * - Tự động đẩy footer xuống dưới cùng
 */
function AuthLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <main className="flex-grow-1">
        <Outlet /> {/* Trang login/register sẽ render ở đây */}
      </main>
      <Footer />
    </div>
  );
}

/**
 * (MỚI) Component gộp cho Trang chủ (vì nó có Hero + CarList)
 */
function HomePage() {
  return (
    <>
      <Hero />
      <CarList />
    </>
  );
}

// === Phần Render chính ===

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("❌ Không tìm thấy <div id='root'></div> trong index.html");
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <Router>
          <UserProvider>
            <OwnerProvider>
              {/* (SỬA) Cấu trúc Routes đã được nhóm lại gọn gàng.
                Không cần lặp lại Navbar/Footer ở mỗi Route.
              */}
              <Routes>
                {/* 1. Nhóm Route Khách hàng (dùng CustomerLayout) */}
                <Route element={<CustomerLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/cars/:id" element={<CarDetail />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/contract" element={<ContractDetail />} />
                  <Route path="/contract-view" element={<ContractView />} />
                  <Route path="/be-owner" element={<BeOwner />} />
                </Route>

                {/* 2. Nhóm Route Chủ xe (dùng OwnerLayout) */}
                <Route element={<OwnerLayout />}>
                  <Route path="/owner-dashboard" element={<OwnerDashboard />} />
                  <Route path="/OwnerCars" element={<OwnerCars />} />
                  <Route path="/OwnerContracts" element={<OwnerContracts />} />
                  <Route path="/OwnerBranches" element={<OwnerBranches />} />
                  <Route path="/owner-profile" element={<OwnerProfile />} />
                  <Route path="/owner-contract-view" element={<ContractView />} />
                  <Route path="/owner-calendar" element={<OwnerCalendar />} />
                </Route>
                
                {/* 3. Nhóm Route Đăng nhập/Đăng ký (dùng AuthLayout) */}
                <Route element={<AuthLayout />}>
                  <Route path="/login-owner" element={<OwnerLoginModal />} />
                  <Route path="/register-owner" element={<OwnerRegisterModal />} />
                </Route>
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
              </Routes>
            </OwnerProvider>
          </UserProvider>
        </Router>
      </StrictMode>
    );
  } catch (err) {
    console.error("Lỗi khi render React:", err);
  }
}
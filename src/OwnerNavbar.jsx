import "./navbar.css";
import { Link } from "react-router-dom";
import { useOwner } from "./OwnerContext";
import { useState } from "react";

function OwnerNavbar() {
  const { owner, logout } = useOwner();

  return (
    <header className="p-3 bg-dark text-white">
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
          
          {/* Logo */}
          <Link
            to="/owner-dashboard"
            className="d-flex align-items-center mb-2 me-5 mb-lg-0 text-white text-decoration-none fw-bold fs-4"
          >
            CARENTAL
          </Link>

          {/* Menu chính */}
          <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
            <li>
              <Link to="/owner-dashboard" className="nav-link px-2 text-white">
                Thống kê
              </Link>
            </li>
            <li>
              <Link to="/OwnerCars" className="nav-link px-2 text-white">
                Quản lý xe
              </Link>
            </li>
            <li>
              <Link to="/OwnerContracts" className="nav-link px-2 text-white">
                Hợp đồng thuê xe
              </Link>
            </li>
            <li>
              <Link to="/OwnerBranches" className="nav-link px-2 text-white">
                Chi nhánh
              </Link>
            </li>
            {/* <li>
              <Link to="/owner-calendar" className="nav-link px-2 text-white">
                Lịch xe
              </Link>
            </li> */}
          </ul>

          {/* Xin chào và Đăng xuất */}
          <div className="text-end">
            {owner ? (
              <>
                <span
                  className="me-3 user-name"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => (window.location.href = `/owner-profile`)}
                >
                  Xin chào, <strong>{owner.CX_HOTENCX}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-outline-light me-2"
                  onClick={logout}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <span>Chưa đăng nhập</span>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

export default OwnerNavbar;

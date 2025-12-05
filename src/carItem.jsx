import React from "react";
import { FaUsers, FaGasPump, FaCogs, FaMapMarkerAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

const BASE_URL = "http://localhost:3000";

export default function CarItem({ car }) {
  const imgSrc = car?.HinhAnh ? `${BASE_URL}${car.HinhAnh}` : "/placeholder.png"; // đặt placeholder trong public/
  const priceText =
    typeof car?.GiaThueNgay === "number" && !Number.isNaN(car.GiaThueNgay)
      ? `${Math.round(car.GiaThueNgay / 1000).toLocaleString()}K/ngày`
      : (car?.GiaThueNgay ? `${Math.round(Number(car.GiaThueNgay) / 1000).toLocaleString()}K/ngày` : "Liên hệ");

  const handleView = async () => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      if (!user || !user.KH_SOCCCD || !user.KH_SOGPLX || !car?.MaXe) return;
      // fire-and-forget
      fetch(`${BASE_URL}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ KH_SOCCCD: user.KH_SOCCCD, KH_SOGPLX: user.KH_SOGPLX, XE_MAXE: car.MaXe }),
      }).catch(() => {});
    } catch (e) {}
  };

  return (
    <div className="card h-100 shadow-sm border-0 rounded-3">
      <img src={imgSrc} className="card-img-top" alt={car?.TenModel || "Xe"} style={{ height: "180px", objectFit: "cover" }} />

      <div className="card-body d-flex flex-column">
        <h6 className="card-title fw-bold text-uppercase">
          {car?.HangXe} {car?.TenModel}
        </h6>

        <div className="d-flex flex-wrap text-muted small mb-2">
          <span className="me-3"><FaCogs/> {car?.HopSo || "-"}</span>
          <span className="me-3"><FaUsers/> {car?.SoCho ?? "-"} chỗ</span>
          <span><FaGasPump/> {car?.NhienLieu || "-"}</span>
        </div>

        <div className="text-muted small mb-3">
          <FaMapMarkerAlt/> {car?.DiaChi || "-"}
        </div>

        <div className="mt-auto d-flex justify-content-between align-items-center">
          <span className="fw-bold text-success fs-6">{priceText}</span>
          <Link to={`/cars/${car?.MaXe}`} className="btn btn-success btn-sm" onClick={handleView}>Chi tiết</Link>
        </div>
      </div>
    </div>
  );
}
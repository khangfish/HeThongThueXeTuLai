import React, { useEffect, useState, useCallback } from "react";
import CarItem from "./carItem";

const BASE_URL = "http://localhost:3000";

function normalizeCar(c) {
  if (!c) return null;
  return {
    MaXe: c.MaXe || c.XE_MAXE || c.xe || null,
    BienSo: c.BienSo || c.XE_BIENSOXE || "",
    TenModel: c.TenModel || c.MODEL_TENMODEL || "",
    HangXe: c.HangXe || c.HX_TENHANGXE || "",
    GiaThueNgay: typeof c.GiaThueNgay === "number" ? c.GiaThueNgay : (c.GiaThueNgay ? Number(c.GiaThueNgay) : null),
    HinhAnh: c.HinhAnh || c.FolderAnh || c.TIX_LINKHINH || null,
    DiaChi: c.DiaChi || c.ChiNhanhDiaChi || "",
    HopSo: c.HopSo || c.MODEL_TRUYENDONG || "",
    SoCho: typeof c.SoCho !== "undefined" ? c.SoCho : c.MODEL_SOGHE || null,
    NhienLieu: c.NhienLieu || c.MODEL_NHIEULIEU || "",
    // keep original for safety
    __raw: c,
  };
}

export default function CarList() {
  const [cars, setCars] = useState([]);

  const load = useCallback(async () => {
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;

      // Try user-interests first (if user exists)
      if (user && user.KH_SOCCCD && user.KH_SOGPLX) {
        try {
          const res = await fetch(
            `${BASE_URL}/user-interests/${encodeURIComponent(user.KH_SOCCCD)}/${encodeURIComponent(user.KH_SOGPLX)}`,
            { cache: 'no-store' }
          );
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : (data && data.items ? data.items : []);
            if (Array.isArray(arr) && arr.length > 0) {
              setCars(arr.map(normalizeCar).filter(Boolean).slice(0, 8));
              return;
            }
          }
        } catch (e) {
          // ignore and fallback
        }
      }

      // Fallback to /cars
      const r = await fetch(`${BASE_URL}/cars`, { cache: 'no-store' });
      if (!r.ok) throw new Error("Fetch cars failed");
      const all = await r.json();
      const arr = Array.isArray(all) ? all : (all && all.items ? all.items : []);
      setCars(arr.map(normalizeCar).filter(Boolean).slice(0, 8));
    } catch (err) {
      console.error("❌ Lỗi fetch:", err);
      setCars([]);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onPop = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onPop);
    };
  }, [load]);

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4">Xe Dành Cho Bạn</h2>

      <div className="row">
        {cars.map((car) => (
          <div key={car.MaXe || JSON.stringify(car.__raw) } className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
            <CarItem car={car} />
          </div>
        ))}
      </div>
    </div>
  );
}

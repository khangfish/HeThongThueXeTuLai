import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./OwnerDashboard.css"; // Import file CSS đã sửa

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// (MỚI) Helper định dạng số tiền
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

// (MỚI) Tùy chọn cho biểu đồ
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { 
        precision: 0,
        font: { size: 12, family: "'Segoe UI', sans-serif" } 
      },
      grid: {
        color: '#eee', // Màu lưới nhạt hơn
      }
    },
    x: {
      ticks: {
        font: { size: 12, family: "'Segoe UI', sans-serif" }
      },
      grid: {
        display: false, // Bỏ lưới trục x
      }
    }
  },
  elements: {
    bar: {
      borderRadius: 4, // Bo góc thanh bar
      borderSkipped: 'bottom',
    }
  }
};

function OwnerDashboard() {
  const [owner, setOwner] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("owner");
    if (stored) setOwner(JSON.parse(stored));
    else navigate("/login-owner");
  }, [navigate]);

  const fetchStats = (yearValue) => {
    if (!owner || !yearValue) return;
    const params = new URLSearchParams({ year: yearValue });
    fetch(`http://localhost:3000/owner/stats/${owner.CX_MACX}?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch((err) => {
        console.error("Lỗi load thống kê:", err);
        setStats({
          tongQuan: { tongDoanhThu: 0, tongLuot: 0, tongXe: 0 },
          luotThueThang: [],
          topXeLuot: [],
          topXeDoanhThu: [],
        });
      });
  };

  useEffect(() => {
    if (owner) {
      const cur = new Date().getFullYear();
      setSelectedYear({ value: cur, label: `Năm ${cur}` });
      // fetchStats(cur); // Bỏ dòng này vì hook dưới sẽ chạy
    }
  }, [owner]);

  useEffect(() => {
    if (owner && selectedYear) { // (SỬA) Chỉ fetch khi có cả owner và selectedYear
      fetchStats(selectedYear.value);
    }
  }, [owner, selectedYear]); // (SỬA) Thêm owner vào dependency

  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: y, label: `Năm ${y}` };
  });

  if (!owner) {
    return (
      <div className="container text-center mt-5">
        <h4>Vui lòng đăng nhập để xem bảng thống kê chủ xe</h4>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-success"></div>
        <p>Đang tải thống kê...</p>
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthlyData = months.map((m) => {
    const rec = (stats?.luotThueThang || []).find((r) => Number(r.thang) === m);
    return rec ? Number(rec.soLuot || rec.soLuot === 0 ? rec.soLuot : 0) : 0;
  });
  
  // (MỚI) Dữ liệu cho biểu đồ
  const barChartData = {
    labels: months.map((m) => `Tháng ${m}`),
    datasets: [
      {
        label: "Số lượt thuê",
        data: monthlyData,
        backgroundColor: "#198754",
        hoverBackgroundColor: "#157347",
      },
    ],
  };

  return (
    // (SỬA) Bỏ class 'container' để dùng full-width
    <div className="owner-dashboard py-4"> 
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-success mb-0">Bảng thống kê</h2>
          <div style={{ width: 220 }}>
            <Select
              options={yearOptions}
              value={selectedYear}
              onChange={(v) => setSelectedYear(v)}
              placeholder="Chọn năm"
              // (MỚI) Style cho react-select
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#198754',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#157347'
                  }
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#198754' : (state.isFocused ? '#f0f9f4' : 'white'),
                  color: state.isSelected ? 'white' : 'black',
                  '&:active': {
                    backgroundColor: '#157347',
                    color: 'white',
                  }
                })
              }}
            />
          </div>
        </div>

        {/* (SỬA) Thống kê tổng quan (toàn thời gian) */}
        <h5 className="text-muted mb-3">Tổng quan (Toàn thời gian)</h5>
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="stat-card p-4">
              <h6 className="text-muted">Tổng doanh thu</h6>
              <p className="display-6 fw-bold text-success">
                {formatCurrency(stats?.tongQuan?.tongDoanhThu)}
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card p-4">
              <h6 className="text-muted">Tổng lượt thuê</h6>
              <p className="display-6 fw-bold text-success">{stats?.tongQuan?.tongLuot || 0}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card p-4">
              <h6 className="text-muted">Số xe đã cho thuê</h6>
              <p className="display-6 fw-bold text-success">{stats?.tongQuan?.tongXe || 0}</p>
            </div>
          </div>
        </div>

        {/* (SỬA) Bố cục mới: Chart + Top Lists */}
        <h5 className="text-muted mb-3">Thống kê chi tiết ({selectedYear?.value})</h5>
        <div className="row g-4">
          {/* Chart (SỬA) */}
          <div className="col-lg-12">
            <div className="chart-card p-4">
              <h5 className="text-center text-success mb-3">Lượt thuê theo tháng</h5>
              <div style={{ height: '350px' }}>
                <Bar data={barChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Top Lists (SỬA) */}
          <div className="col-lg-6">
            <div className="chart-card p-4">
              <h5 className="text-center text-success mb-3">Top 5 xe doanh thu cao nhất</h5>
              <ul className="list-group list-group-flush">
                {(stats?.topXeDoanhThu || []).length === 0 && (
                  <li className="list-group-item text-center text-muted">Không có dữ liệu</li>
                )}
                {(stats?.topXeDoanhThu || []).map((x, i) => (
                  <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold">{x.BienSo}</div>
                      <div className="small text-muted">{x.HangXe || "-"} {x.Model || "-"}</div>
                    </div>
                    <span className="fw-bold text-success fs-5">
                      {formatCurrency(x.TongDoanhThu)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="col-lg-6">
            <div className="chart-card p-4">
              <h5 className="text-center text-success mb-3">Top 5 xe được thuê nhiều nhất</h5>
              <ul className="list-group list-group-flush">
                {(stats?.topXeLuot || []).length === 0 && (
                  <li className="list-group-item text-center text-muted">Không có dữ liệu</li>
                )}
                {(stats?.topXeLuot || []).map((x, i) => (
                  <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold">{x.BienSo}</div>
                      <div className="small text-muted">{x.HangXe || "-"} {x.Model || "-"}</div>
                    </div>
                    <span className="fw-bold text-success fs-5">
                      {x.SoLanThue} lượt
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;
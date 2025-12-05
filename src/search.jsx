import React, { useEffect, useState } from "react";
import CarItem from "./carItem";

const API = "http://localhost:3000";

function normalizeModelName(name) {
  if (!name) return "";
  let s = name.replace(/\(.*?\)/g, "");
  s = s.replace(/\b(19|20)\d{2}\b/g, "");
  s = s.replace(/[-_\/]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

// new helper: dedupe by MaXe (stable first-occurrence)
function dedupeByMaXe(arr = []) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const id = it?.MaXe ?? it?.XE_MAXE ?? null;
    const key = id ?? JSON.stringify(it);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

export default function Search() {
  const [cars, setCars] = useState([]);
  const [options, setOptions] = useState({ hang: [], model: [], baseModels: [], chinhanh: [] });
  const [filters, setFilters] = useState({
    hang: "",
    model: "",
    giaMin: "",
    giaMax: "",
    soCho: "",
    hopSo: "",
    tinhThanh: "",
  });

  // pagination state
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // load filter-options once, build baseModels
  useEffect(() => {
    fetch(`${API}/filter-options`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data.model || [];
        const map = {};
        raw.forEach((m) => {
          const base = normalizeModelName(m.model);
          if (!base) return;
          map[m.hang] = map[m.hang] || new Set();
          map[m.hang].add(base);
        });
        const baseModels = [];
        Object.keys(map).forEach((hang) => {
          map[hang].forEach((base) => baseModels.push({ hang, base }));
        });
        setOptions({
          hang: data.hang || [],
          model: raw,
          baseModels,
          chinhanh: data.chinhanh || [],
        });
      })
      .catch((e) => console.error("Lỗi khi lấy filter-options:", e));
  }, []);

  // helper fetch page with current filters
  const fetchPage = (p = 1, currentFilters = filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    params.append("page", p);
    params.append("pageSize", pageSize);

    return fetch(`${API}/cars/search?${params}`)
      .then((r) => r.json())
      .then((data) => {
        // normalize response shape (items may be at root or in data.items)
        const incoming = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : (data.items || []);
        if (p === 1) {
          setCars(dedupeByMaXe(incoming));
        } else {
          setCars((prev) => dedupeByMaXe(prev.concat(incoming)));
        }
        setPage(p);
        if (typeof data.total === "number") setHasMore(p * pageSize < data.total);
        else setHasMore((incoming || []).length === pageSize);
      })
      .catch((e) => console.error("Lỗi khi lấy danh sách xe:", e))
      .finally(() => setLoading(false));
  };

  // initial load: page 1
  useEffect(() => {
    fetchPage(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // nếu đổi hãng, reset model selection
    setFilters((prev) => ({ ...prev, [name]: value, ...(name === "hang" ? { model: "" } : {}) }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPage(1, filters);
  };

  const handleLoadMore = (e) => {
    e.preventDefault();
    if (loading || !hasMore) return;
    fetchPage(page + 1, filters);
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Tìm kiếm xe phù hợp</h2>

      <form onSubmit={handleSearch}>
        <div className="row g-2">
          <div className="col-6 col-sm-4 col-lg-2">
            <label className="form-label">Hãng xe</label>
            <select name="hang" className="form-select" value={filters.hang} onChange={handleChange}>
              <option value="">-- Chọn hãng --</option>
              {options.hang.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-sm-4 col-lg-2">
            <label className="form-label">Model</label>
            <select name="model" className="form-select" value={filters.model} onChange={handleChange}>
              <option value="">-- Chọn model --</option>
              {(options.baseModels || [])
                .filter((m) => !filters.hang || m.hang === filters.hang)
                .map((m, i) => (
                  <option key={i} value={m.base}>
                    {`${m.hang} ${m.base}`}
                  </option>
                ))}
            </select>
          </div>

          <div className="col-6 col-sm-4 col-lg-1">
            <label className="form-label">Giá từ</label>
            <input type="number" name="giaMin" value={filters.giaMin} onChange={handleChange} className="form-control" />
          </div>

          <div className="col-6 col-sm-4 col-lg-1">
            <label className="form-label">Đến</label>
            <input type="number" name="giaMax" value={filters.giaMax} onChange={handleChange} className="form-control" />
          </div>

          <div className="col-6 col-sm-3 col-lg-1">
            <label className="form-label">Số chỗ</label>
            <select name="soCho" className="form-select" value={filters.soCho} onChange={handleChange}>
              <option value="">-- Chọn --</option>
              {[5, 7, 16].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-sm-4 col-lg-2">
            <label className="form-label">Hộp số</label>
            <select name="hopSo" className="form-select" value={filters.hopSo} onChange={handleChange}>
              <option value="">-- Chọn --</option>
              <option value="Số sàn">Số sàn</option>
              <option value="Số tự động">Số tự động</option>
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label">Tỉnh / Thành phố</label>
            <select name="tinhThanh" className="form-select" value={filters.tinhThanh} onChange={handleChange}>
              <option value="">-- Chọn tỉnh/thành --</option>
              {options.chinhanh.map((cn, i) => (
                <option key={i} value={cn}>
                  {cn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col d-flex justify-content-center">
            <button type="submit" className="btn btn-success px-4">
              Tìm xe
            </button>
          </div>
        </div>
      </form>

      <div className="row mt-4">
        {cars.length > 0 ? (
          cars.map((car, i) => (
            <div key={`${car.MaXe ?? "car"}-${i}`} className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
              <CarItem car={car} />
            </div>
          ))
        ) : (
          <p className="text-center text-muted">Không tìm thấy xe phù hợp</p>
        )}
      </div>

      {hasMore && (
        <div className="row mt-3">
          <div className="col d-flex justify-content-center">
            <a href={`?page=${page + 1}`} onClick={handleLoadMore} className={`btn btn-success mb-4 ${loading ? "disabled" : ""}`}>
              {loading ? "Đang tải..." : "Tải thêm"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
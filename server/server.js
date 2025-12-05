import express from "express";
import cors from "cors";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import multer from "multer";
import cron from "node-cron";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uploadsRoot = path.join(__dirname, "uploads");
app.use(
  "/uploads",
  express.static(uploadsRoot, {
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) res.setHeader("Content-Type", "image/jpeg");
      else if (lower.endsWith(".png")) res.setHeader("Content-Type", "image/png");
      else if (lower.endsWith(".webp")) res.setHeader("Content-Type", "image/webp");
    },
  })
);

const tempDir = path.join(uploadsRoot, 'temp');
try {
  await fs.mkdir(tempDir, { recursive: true });
} catch (e) {
  console.warn("Không thể tạo thư mục temp, có thể nó đã tồn tại.");
}

const upload = multer({ dest: tempDir });

function queryAsync(sql, params = []) {
  if (typeof db.promise === "function") {
    return db.promise().query(sql, params).then(([rows]) => rows);
  }
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function getFirstImage(folderFromDb) {
  if (!folderFromDb) return null;
  
  try {
    // folderFromDb đã là "uploads/..."
    const folderPath = path.join(__dirname, folderFromDb);
    
    // Kiểm tra thư mục có tồn tại không
    await fs.access(folderPath); 
    
    // Đọc thư mục (Bất đồng bộ)
    const files = await fs.readdir(folderPath);
    
    // Tìm ảnh đầu tiên
    const img = files.find((f) => f.match(/\.(jpg|jpeg|png|webp|gif)$/i));
    
    if (img) {
      // Trả về đường dẫn URL web
      return `/${folderFromDb}/${img}`.replace(/\\/g, '/');
    }
    return null;
  } catch (e) {
    // Thư mục không tồn tại hoặc không đọc được
    // console.warn(`Không tìm thấy thư mục ảnh: ${folderFromDb}`, e.message);
    return null;
  }
}

async function getAllImages(folderFromDb) {
  if (!folderFromDb) return [];

  try {
    const folderPath = path.join(__dirname, folderFromDb);
    await fs.access(folderPath);
    const files = await fs.readdir(folderPath);
    
    const imageFiles = files
      .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .map(f => `/${folderFromDb}/${f}`.replace(/\\/g, '/'));
      
    return imageFiles;
  } catch (e) {
    console.error(`Không đọc được folder ảnh: ${folderFromDb}`, e.message);
    return [];
  }
}

/* Bộ lọc dữ liệu  */
app.get("/filter-options", async (req, res) => {
  // ... (Không đổi)
  try {
    const hangRows = await queryAsync("SELECT HX_TENHANGXE AS value FROM HANG_XE");
    const modelRows = await queryAsync(`
      SELECT MODEL.MODEL_TENMODEL AS model, HANG_XE.HX_TENHANGXE AS hang
      FROM MODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
    `);
    const chinhanhRows = await queryAsync("SELECT DISTINCT TP_TENTP AS value FROM THANH_PHO");

    res.json({
      hang: (hangRows || []).map((r) => r.value).filter(Boolean),
      model: (modelRows || []).map((r) => ({ model: r.model, hang: r.hang })).filter(Boolean),
      chinhanh: (chinhanhRows || []).map((r) => r.value).filter(Boolean),
    });
  } catch (err) {
    console.error("Error /filter-options:", err);
    res.status(500).json({ error: "Lỗi khi lấy filter options" });
  }
});

/* Danh sách xe  */
app.get("/cars", async (req, res) => {
  try {
    const sql = `
      SELECT
        XE.XE_MAXE AS MaXe,
        XE.XE_BIENSOXE AS BienSo,
        MODEL.MODEL_TENMODEL AS TenModel,
        HANG_XE.HX_TENHANGXE AS HangXe,
        MODEL.MODEL_TRUYENDONG AS HopSo,
        MODEL.MODEL_SOGHE AS SoCho,
        MODEL.MODEL_NHIENLIEU AS NhienLieu,
        BANG_GIA.BG_GIATHUETHEONGAY AS GiaThueNgay,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
        CONCAT_WS(', ', DUONG.DUONG_TENDUONG, PHUONG.PHUONG_TENPHUONG, THANH_PHO.TP_TENTP) AS DiaChi,
        CHI_NHANH_THUE_XE.CNTX_LONGTITUDE AS Longitude,
        CHI_NHANH_THUE_XE.CNTX_LATITUDE AS Latitude,
        CHI_NHANH_THUE_XE.CNTX_SODIACHI AS ChiNhanhDiaChi,
        BANG_GIA.CX_MACX AS CX_MACX,
        
        COALESCE(QT_Stats.viewCount, 0) AS viewCount

      FROM XE
      JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      
      -- Lọc giá hiện tại
      LEFT JOIN BANG_GIA ON XE.XE_MAXE = BANG_GIA.XE_MAXE
        AND (BANG_GIA.BG_NGAYGIONGUNGAPDUNG IS NULL OR BANG_GIA.BG_NGAYGIONGUNGAPDUNG > NOW())
      
      LEFT JOIN TIEN_ICH_XE ON XE.XE_MAXE = TIEN_ICH_XE.XE_MAXE
      
      -- Lọc trạng thái và chi nhánh
      LEFT JOIN BAN_GHI_TINH_TRANG bg_current
        ON XE.XE_MAXE = bg_current.XE_MAXE
        AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW())
        AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
      LEFT JOIN CHI_NHANH_THUE_XE ON bg_current.CNTX_MACNTX = CHI_NHANH_THUE_XE.CNTX_MACNTX
      
      -- Lọc xe bảo dưỡng
      LEFT JOIN (
        SELECT DISTINCT XE_MAXE FROM BAN_GHI_TINH_TRANG
        WHERE TTX_MATTX = 3 AND BGTT_NGAYGIOKETTHUC IS NULL
      ) bg_maint ON bg_maint.XE_MAXE = XE.XE_MAXE
      
      -- Địa chỉ
      LEFT JOIN DUONG ON CHI_NHANH_THUE_XE.DUONG_MADUONG = DUONG.DUONG_MADUONG
      LEFT JOIN PHUONG ON DUONG.PHUONG_MAPHUONG = PHUONG.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO ON PHUONG.TP_MATP = THANH_PHO.TP_MATP
      LEFT JOIN CHU_XE ON CHI_NHANH_THUE_XE.CX_MACX = CHU_XE.CX_MACX
      
      -- (MỚI) JOIN bảng lượt xem (Popularity Logic)
      LEFT JOIN (
        SELECT XE_MAXE, COUNT(*) AS viewCount 
        FROM QUAN_TAM 
        WHERE QT_THOIDIEMXEM >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY XE_MAXE
      ) AS QT_Stats ON XE.XE_MAXE = QT_Stats.XE_MAXE

      WHERE bg_maint.XE_MAXE IS NULL
      
      -- (MỚI) Sắp xếp theo độ phổ biến (Hot nhất lên đầu)
      ORDER BY viewCount DESC, XE.XE_MAXE DESC
    `;
    const rows = await queryAsync(sql);
    
    const mapped = await Promise.all((rows || []).map(async (car) => {
      const hinhAnh = await getFirstImage(car.FolderAnh);
      return { ...car, HinhAnh: hinhAnh };
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Error /cars:", err);
    res.status(500).json({ error: "Lỗi khi lấy danh sách xe" });
  }
});

/* Tìm kiếm xe  */
app.get("/cars/search", async (req, res) => {
  try {
    const {
      hang, model, giaMin, giaMax, soCho, hopSo, nhienLieu,
      chiNhanh, tinhThanh, page = 1, pageSize = 12,
    } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.max(1, parseInt(pageSize, 10) || 12);
    const offset = (p - 1) * ps;
    
    // Thêm LEFT JOIN cho bảng QUAN_TAM (Lượt xem)
    const baseFrom = `
      FROM XE
      JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      
      -- Thêm điều kiện lọc giá hiện tại
      LEFT JOIN BANG_GIA ON XE.XE_MAXE = BANG_GIA.XE_MAXE
        AND (BANG_GIA.BG_NGAYGIONGUNGAPDUNG IS NULL OR BANG_GIA.BG_NGAYGIONGUNGAPDUNG > NOW())

      LEFT JOIN BAN_GHI_TINH_TRANG bg_current
        ON XE.XE_MAXE = bg_current.XE_MAXE
        AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW())
        AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
      LEFT JOIN CHI_NHANH_THUE_XE ON bg_current.CNTX_MACNTX = CHI_NHANH_THUE_XE.CNTX_MACNTX
      LEFT JOIN (
        SELECT DISTINCT XE_MAXE FROM BAN_GHI_TINH_TRANG
        WHERE TTX_MATTX = 3 AND BGTT_NGAYGIOKETTHUC IS NULL
      ) bg_maint ON bg_maint.XE_MAXE = XE.XE_MAXE
      LEFT JOIN DUONG ON CHI_NHANH_THUE_XE.DUONG_MADUONG = DUONG.DUONG_MADUONG
      LEFT JOIN PHUONG ON DUONG.PHUONG_MAPHUONG = PHUONG.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO ON PHUONG.TP_MATP = THANH_PHO.TP_MATP
      
      LEFT JOIN (
        SELECT XE_MAXE, COUNT(*) AS viewCount 
        FROM QUAN_TAM 
        WHERE QT_THOIDIEMXEM >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY XE_MAXE
      ) AS QT_Stats ON XE.XE_MAXE = QT_Stats.XE_MAXE

      WHERE bg_maint.XE_MAXE IS NULL
    `;
    
    const filters = [];
    const params = [];
    if (hang) { filters.push("HANG_XE.HX_TENHANGXE = ?"); params.push(hang); }
    if (model) { filters.push("MODEL.MODEL_TENMODEL LIKE ?"); params.push(`%${model}%`); }
    if (giaMin) { filters.push("BANG_GIA.BG_GIATHUETHEONGAY >= ?"); params.push(giaMin); }
    if (giaMax) { filters.push("BANG_GIA.BG_GIATHUETHEONGAY <= ?"); params.push(giaMax); }
    if (soCho) { filters.push("MODEL.MODEL_SOGHE = ?"); params.push(soCho); }
    if (hopSo) { filters.push("MODEL.MODEL_TRUYENDONG = ?"); params.push(hopSo); }
    if (nhienLieu) { filters.push("MODEL.MODEL_NHIENLIEU = ?"); params.push(nhienLieu); }
    if (tinhThanh) { filters.push("THANH_PHO.TP_TENTP LIKE ?"); params.push(`%${tinhThanh}%`); }
    if (chiNhanh) { filters.push("CHI_NHANH_THUE_XE.CNTX_SODIACHI LIKE ?"); params.push(`%${chiNhanh}%`); }
    
    const whereSql = filters.length ? baseFrom + " AND " + filters.join(" AND ") : baseFrom;
    
    const countSql = `SELECT COUNT(DISTINCT XE.XE_MAXE) AS total ${whereSql}`;
    const countRows = await queryAsync(countSql, params);
    const total = (countRows && countRows[0] && typeof countRows[0].total !== "undefined") ? Number(countRows[0].total) : 0;
    
    const dataSql = `
      SELECT
        XE.XE_MAXE AS MaXe,
        XE.XE_BIENSOXE AS BienSo,
        MODEL.MODEL_TENMODEL AS TenModel,
        HANG_XE.HX_TENHANGXE AS HangXe,
        MODEL.MODEL_TRUYENDONG AS HopSo,
        MODEL.MODEL_SOGHE AS SoCho,
        MODEL.MODEL_NHIENLIEU AS NhienLieu,
        BANG_GIA.BG_GIATHUETHEONGAY AS GiaThueNgay,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
        CONCAT_WS(', ', DUONG.DUONG_TENDUONG, PHUONG.PHUONG_TENPHUONG, THANH_PHO.TP_TENTP) AS DiaChi,
        CHI_NHANH_THUE_XE.CNTX_LONGTITUDE AS Longitude,
        CHI_NHANH_THUE_XE.CNTX_LATITUDE AS Latitude,
        COALESCE(QT_Stats.viewCount, 0) AS viewCount -- Lấy số lượt xem (trong 30 ngày)
      ${whereSql}
      
      GROUP BY
        XE.XE_MAXE, XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL, HANG_XE.HX_TENHANGXE,
        MODEL.MODEL_TRUYENDONG, MODEL.MODEL_SOGHE, MODEL.MODEL_NHIENLIEU,
        BANG_GIA.BG_GIATHUETHEONGAY, DiaChi, Longitude, Latitude,
        QT_Stats.viewCount

      ORDER BY viewCount DESC, XE.XE_MAXE DESC
      
      LIMIT ? OFFSET ?
    `;
    const dataParams = params.concat([ps, offset]);
    const rows = await queryAsync(dataSql, dataParams);

    const mapped = await Promise.all((rows || []).map(async (car) => {
      const hinhAnh = await getFirstImage(car.FolderAnh);
      return { ...car, HinhAnh: hinhAnh };
    }));

    res.json({ items: mapped, total });
  } catch (err) {
    console.error("Error /cars/search:", err);
    res.status(500).json({ error: "Lỗi truy vấn xe" });
  }
});

/* Chi tiết xe  */
app.get("/cars/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const sql = `
      SELECT 
        XE.XE_MAXE AS MaXe,
        XE.XE_BIENSOXE AS BienSo,
        MODEL.MODEL_TENMODEL AS TenModel,
        HANG_XE.HX_TENHANGXE AS HangXe,
        MODEL.MODEL_TRUYENDONG AS HopSo,
        MODEL.MODEL_SOGHE AS SoCho,
        MODEL.MODEL_NHIENLIEU AS NhienLieu,
        MODEL.MODEL_TIEUHAO AS TieuHao,
        
        BANG_GIA.BG_GIATHUETHEONGAY AS GiaThueNgay,
        
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
        TIEN_ICH_XE.TIX_BANDO as BanDo,
        TIEN_ICH_XE.TIX_BLUETOOTH as Bluetooth,
        TIEN_ICH_XE.TIX_CAMBIENVACHAM as CamBien,
        TIEN_ICH_XE.TIX_CAMERAHANHTRINH as CamHanhTrinh,
        TIEN_ICH_XE.TIX_CAMERALUI as CamLui,
        TIEN_ICH_XE.TIX_CANHBAOTOCDO as CanhBaoTD,
        TIEN_ICH_XE.TIX_DINHVIGPS as GPS,
        TIEN_ICH_XE.TIX_ETC as ETC,
        TIEN_ICH_XE.TIX_KHECAMUSB as USB,
        TIEN_ICH_XE.TIX_LOPDUPHONG as DuPhong,
        TIEN_ICH_XE.TIX_MANHINHDVD as DVD,
        TIEN_ICH_XE.TIX_TUIKHIANTOAN as TuiKhi,
        THANH_PHO.TP_TENTP AS TinhThanh,
        CONCAT_WS(', ', DUONG.DUONG_TENDUONG, PHUONG.PHUONG_TENPHUONG, THANH_PHO.TP_TENTP) AS DiaChi,
        CHI_NHANH_THUE_XE.CNTX_LONGTITUDE AS Longitude,
        CHI_NHANH_THUE_XE.CNTX_LATITUDE AS Latitude,
        CHI_NHANH_THUE_XE.CX_MACX AS CX_MACX,
        CHU_XE.CX_HOTENCX AS CX_HOTENCX,
        CHU_XE.CX_SODT AS CX_SODT,
        CHU_XE.CX_EMAIL AS CX_EMAIL,
        CHU_XE.CX_STK AS CX_STK,
        CHU_XE.CX_NGANHANG AS CX_NGANHANG,
        CHI_NHANH_THUE_XE.CNTX_SODIACHI AS ChiNhanhDiaChi
      FROM XE
      JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      
      -- Giữ lại điều kiện lọc giá (logic này ĐÚNG)
      LEFT JOIN BANG_GIA ON XE.XE_MAXE = BANG_GIA.XE_MAXE
        AND (BANG_GIA.BG_NGAYGIONGUNGAPDUNG IS NULL OR BANG_GIA.BG_NGAYGIONGUNGAPDUNG > NOW())
      
      LEFT JOIN TIEN_ICH_XE ON XE.XE_MAXE = TIEN_ICH_XE.XE_MAXE
      LEFT JOIN BAN_GHI_TINH_TRANG bg_current
        ON XE.XE_MAXE = bg_current.XE_MAXE
        AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW())
        AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
      LEFT JOIN CHI_NHANH_THUE_XE ON bg_current.CNTX_MACNTX = CHI_NHANH_THUE_XE.CNTX_MACNTX
      LEFT JOIN DUONG ON CHI_NHANH_THUE_XE.DUONG_MADUONG = DUONG.DUONG_MADUONG
      LEFT JOIN PHUONG ON DUONG.PHUONG_MAPHUONG = PHUONG.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO ON PHUONG.TP_MATP = THANH_PHO.TP_MATP
      LEFT JOIN CHU_XE ON CHI_NHANH_THUE_XE.CX_MACX = CHU_XE.CX_MACX
      WHERE XE.XE_MAXE = ? 
      
      LIMIT 1 -- Giữ lại LIMIT 1
    `;
    const rows = await queryAsync(sql, [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Không tìm thấy xe" });

    const car = rows[0];

    const terms = await queryAsync(`
      SELECT DKSDDV_MADKSDDV, DKSDDV_NOIDUNG AS NoiDung, CX_MACX
      FROM DIEU_KHOAN_SU_DUNG_DV
      WHERE DKSDDV_NGAYGIONGUNGAPDUNG IS NULL
        AND (CX_MACX IS NULL OR CX_MACX = ?)
      ORDER BY DKSDDV_MADKSDDV
    `, [car.CX_MACX]);

    car.HinhAnh = await getFirstImage(car.FolderAnh);
    car.DieuKhoan = terms || [];

    res.json(car);
  } catch (err) {
    console.error("Error /cars/:id", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

/* Ảnh xe  */
app.get("/car-images/:id", async (req, res) => {
  const carId = req.params.id;
  try {
    const sql = `SELECT TIX_LINKHINH AS FolderAnh FROM TIEN_ICH_XE WHERE XE_MAXE = ? LIMIT 1`;
    const result = await queryAsync(sql, [carId]);
    
    if (!result || result.length === 0 || !result[0].FolderAnh) {
      return res.json([]); // Trả về mảng rỗng nếu không có thư mục
    }
    
    const imageUrls = await getAllImages(result[0].FolderAnh);
    res.json(imageUrls);
    
  } catch (e) {
    console.error("❌ Lỗi /car-images/:id:", e);
    res.status(500).json({ error: "Không đọc được thư mục ảnh" });
  }
});

/* Health check  */
app.get("/health", (req, res) => {
  // Sửa: dùng fs.promises.access
  fs.access(uploadsRoot)
    .then(() => res.json({ ok: true, uploadsExists: true }))
    .catch(() => res.json({ ok: true, uploadsExists: false }));
});

/* Gợi ý xe  */
app.get("/recommend/:id", async (req, res) => {
  const carId = req.params.id;
  try {
    // 1. Lấy thông tin xe gốc (lỗi ambiguous column)
    const carRows = await queryAsync(
      `SELECT 
         M.MODEL_MAMODEL, M.HX_MAHANGXE, M.MODEL_SOGHE 
       FROM XE X
       JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
       WHERE X.XE_MAXE = ?`, 
      [carId]
    );
    if (carRows.length === 0) return res.json([]);

    const car = carRows[0];
    const modelId = car.MODEL_MAMODEL;
    const brandId = car.HX_MAHANGXE;
    const seatCount = car.MODEL_SOGHE;

    // 2. Xây dựng truy vấn tính điểm
    const sql = `
      SELECT
        XE.XE_MAXE AS MaXe,
        XE.XE_BIENSOXE AS BienSo,
        MODEL.MODEL_TENMODEL AS TenModel,
        HANG_XE.HX_TENHANGXE AS HangXe,
        MODEL.MODEL_TRUYENDONG AS HopSo,
        MODEL.MODEL_SOGHE AS SoCho,
        MODEL.MODEL_NHIENLIEU AS NhienLieu,
        BG.BG_GIATHUETHEONGAY AS GiaThueNgay,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
        CONCAT_WS(', ', D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP) AS DiaChi,
        (
          (CASE WHEN MODEL.MODEL_MAMODEL = ? THEN 10 ELSE 0 END) +
          (CASE WHEN MODEL.HX_MAHANGXE = ? THEN 7 ELSE 0 END) +
          (CASE WHEN MODEL.MODEL_SOGHE = ? THEN 5 ELSE 0 END)    
        ) AS similarity_score
      FROM XE
      JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      LEFT JOIN (
        SELECT * FROM BANG_GIA 
        WHERE BG_NGAYGIONGUNGAPDUNG IS NULL OR BG_NGAYGIONGUNGAPDUNG > NOW()
      ) BG ON XE.XE_MAXE = BG.XE_MAXE
      LEFT JOIN BAN_GHI_TINH_TRANG bg_current
        ON XE.XE_MAXE = bg_current.XE_MAXE
        AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW())
        AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
      LEFT JOIN CHI_NHANH_THUE_XE CNTX ON bg_current.CNTX_MACNTX = CNTX.CNTX_MACNTX
      LEFT JOIN (
        SELECT DISTINCT XE_MAXE FROM BAN_GHI_TINH_TRANG
        WHERE TTX_MATTX = 3 AND BGTT_NGAYGIOKETTHUC IS NULL
      ) bg_maint ON bg_maint.XE_MAXE = XE.XE_MAXE
      LEFT JOIN DUONG D ON CNTX.DUONG_MADUONG = D.DUONG_MADUONG
      LEFT JOIN PHUONG P ON D.PHUONG_MAPHUONG = P.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO T ON P.TP_MATP = T.TP_MATP
      
      WHERE bg_maint.XE_MAXE IS NULL -- Bỏ xe đang bảo dưỡng
        AND XE.XE_MAXE != ?          -- Bỏ xe hiện tại
      
      -- Sửa lỗi GROUP BY
      GROUP BY 
        XE.XE_MAXE, XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL,
        HANG_XE.HX_TENHANGXE, MODEL.MODEL_TRUYENDONG, MODEL.MODEL_SOGHE,
        MODEL.MODEL_NHIENLIEU, BG.BG_GIATHUETHEONGAY, DiaChi, CNTX.CNTX_LONGTITUDE, CNTX.CNTX_LATITUDE

      ORDER BY similarity_score DESC, RAND() -- Ưu tiên điểm cao, sau đó ngẫu nhiên
      LIMIT 4
    `;
    
    const rows = await queryAsync(sql, [modelId, brandId, seatCount, carId]);
    
    // 3. Lấy ảnh (như cũ)
    const mapped = await Promise.all((rows || []).map(async (car) => {
      const hinhAnh = await getFirstImage(car.FolderAnh);
      return { ...car, HinhAnh: hinhAnh };
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Error /recommend:", err);
    res.status(500).json({ error: "Lỗi tải xe gợi ý" });
  }
});

/* Lịch sử thuê xe  */
app.get("/rent-history/:cccd/:gplx", async (req, res) => {
  const { cccd, gplx } = req.params;
  try {
    const sql = `
      SELECT 
        H.HDT_MAHDT,
        H.XE_MAXE,
        H.HDT_NGAYGIOBDTHUE,
        H.HDT_NGAYGIOKTTHUE,
        H.HDT_NGAYGIOLAPHOPDONG,
        H.HDT_CHITIETHD,
        H.CX_MACX, -- Cần cái này để lấy điều khoản
        
        -- Thông tin xe
        XE.XE_BIENSOXE AS BienSo, 
        MODEL.MODEL_TENMODEL AS TenModel,
        HANG_XE.HX_TENHANGXE AS HangXe,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = H.XE_MAXE LIMIT 1) AS FolderAnh,
        
        -- Thông tin chủ xe
        CHU_XE.CX_HOTENCX,
        CHU_XE.CX_SODT,
        CHU_XE.CX_EMAIL,

        -- Lấy GIÁ THUÊ (Ưu tiên giá lịch sử, fallback giá hiện tại)
        COALESCE(
          (SELECT BG_GIATHUETHEONGAY FROM BANG_GIA 
           WHERE XE_MAXE = H.XE_MAXE AND BG_NGAYGIOAPDUNG <= H.HDT_NGAYGIOLAPHOPDONG 
           ORDER BY BG_NGAYGIOAPDUNG DESC LIMIT 1),
          (SELECT BG_GIATHUETHEONGAY FROM BANG_GIA 
           WHERE XE_MAXE = H.XE_MAXE 
           ORDER BY BG_NGAYGIOAPDUNG DESC LIMIT 1),
          0
        ) AS GiaThueNgay,

        -- Tính SỐ NGÀY (+1)
        GREATEST(TIMESTAMPDIFF(DAY, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE) + 1, 1) AS Days

      FROM HOP_DONG_THUE H
      JOIN XE ON H.XE_MAXE = XE.XE_MAXE
      JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      LEFT JOIN CHU_XE ON H.CX_MACX = CHU_XE.CX_MACX
      
      WHERE H.KH_SOCCCD = ? AND H.KH_SOGPLX = ?
      
      GROUP BY 
        H.HDT_MAHDT, H.XE_MAXE, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE, 
        H.HDT_NGAYGIOLAPHOPDONG, H.HDT_CHITIETHD, H.CX_MACX,
        XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL, HANG_XE.HX_TENHANGXE, 
        CHU_XE.CX_HOTENCX, CHU_XE.CX_SODT, CHU_XE.CX_EMAIL
      
      ORDER BY H.HDT_NGAYGIOLAPHOPDONG DESC
    `;
    const rows = await queryAsync(sql, [cccd, gplx]);

    // Xử lý thêm: Ảnh + Tổng tiền + Điều khoản
    const mapped = await Promise.all((rows || []).map(async (item) => {
      // 1. Lấy ảnh
      const hinhAnh = await getFirstImage(item.FolderAnh);
      
      // 2. Tính tổng tiền
      const total = (item.GiaThueNgay || 0) * (item.Days || 0);

      // 3. Lấy danh sách ĐIỀU KHOẢN (Chung + Riêng của chủ xe)
      // Lưu ý: Lấy những điều khoản đang áp dụng hoặc đã áp dụng tại thời điểm thuê
      // Để đơn giản, ta lấy tất cả điều khoản hiện tại của chủ xe đó
      const terms = await queryAsync(
        `SELECT DKSDDV_NOIDUNG as NoiDung 
         FROM DIEU_KHOAN_SU_DUNG_DV 
         WHERE (CX_MACX IS NULL OR CX_MACX = ?)
         ORDER BY CX_MACX ASC`, // Điều khoản chung trước, riêng sau
        [item.CX_MACX]
      );

      return { 
        ...item, 
        HinhAnh: hinhAnh,
        Total: total,
        DieuKhoan: terms // Trả về mảng điều khoản
      };
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Error /rent-history:", err);
    res.status(500).json({ error: "Lỗi khi lấy lịch sử thuê" });
  }
});

/* Chi tiết hợp đồng  */
app.get("/contracts/:mahd", async (req, res) => {
  const { mahd } = req.params;
  try {
    const sql = `
      SELECT
        H.HDT_MAHDT, H.KH_SOCCCD, H.KH_SOGPLX, H.XE_MAXE, H.CX_MACX, H.HDT_CHITIETHD,
        H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE, H.HDT_NGAYGIOLAPHOPDONG,
        
        K.KH_TENND, K.KH_SODIENTHOAI, K.KH_EMAIL AS KH_EMAIL,
        
        XE.XE_BIENSOXE AS BienSo, MODEL.MODEL_TENMODEL AS TenModel, HANG_XE.HX_TENHANGXE AS HangXe,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
        
        CHU_XE.CX_HOTENCX, CHU_XE.CX_SODT, CHU_XE.CX_EMAIL AS CX_EMAIL,
        CHU_XE.CX_STK, CHU_XE.CX_NGANHANG,

        (SELECT COALESCE(b.BG_GIATHUETHEONGAY, 0)
           FROM BANG_GIA b
           WHERE b.XE_MAXE = H.XE_MAXE AND b.CX_MACX = H.CX_MACX
           AND b.BG_NGAYGIOAPDUNG <= H.HDT_NGAYGIOLAPHOPDONG
           ORDER BY b.BG_NGAYGIOAPDUNG DESC
           LIMIT 1) AS GiaThueNgay,

        CNTX.CNTX_SODIACHI AS ChiNhanhDiaChi,
        CONCAT_WS(', ', D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP) AS DiaChi

      FROM HOP_DONG_THUE H
      LEFT JOIN KHACH_HANG K ON H.KH_SOCCCD = K.KH_SOCCCD AND H.KH_SOGPLX = K.KH_SOGPLX
      LEFT JOIN XE ON H.XE_MAXE = XE.XE_MAXE
      LEFT JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
      LEFT JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
      LEFT JOIN CHU_XE ON H.CX_MACX = CHU_XE.CX_MACX
      
      LEFT JOIN BAN_GHI_TINH_TRANG BGTT ON H.XE_MAXE = BGTT.XE_MAXE 
        AND BGTT.TTX_MATTX = 2 
        AND H.HDT_NGAYGIOBDTHUE = BGTT.BGTT_NGAYGIOBATDAU 
      LEFT JOIN CHI_NHANH_THUE_XE CNTX ON BGTT.CNTX_MACNTX = CNTX.CNTX_MACNTX
      LEFT JOIN DUONG D ON CNTX.DUONG_MADUONG = D.DUONG_MADUONG
      LEFT JOIN PHUONG P ON D.PHUONG_MAPHUONG = P.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO T ON P.TP_MATP = T.TP_MATP

      WHERE H.HDT_MAHDT = ?
      LIMIT 1
    `;
    const rows = await queryAsync(sql, [mahd]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });

    const c = rows[0];
    
    const start = new Date(c.HDT_NGAYGIOBDTHUE);
    const end = new Date(c.HDT_NGAYGIOKTTHUE);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysSql = Math.max(1, diff + 1);
    const total = (c.GiaThueNgay || 0) * daysSql;

    // (QUAN TRỌNG) Lọc bỏ điều khoản đã hủy
    const terms = await queryAsync(`
      SELECT DKSDDV_MADKSDDV, DKSDDV_NOIDUNG AS NoiDung
      FROM DIEU_KHOAN_SU_DUNG_DV
      WHERE (CX_MACX IS NULL OR CX_MACX = ?)
        AND DKSDDV_NGAYGIONGUNGAPDUNG IS NULL -- Chỉ lấy điều khoản còn hiệu lực
      ORDER BY CX_MACX ASC
    `, [c.CX_MACX]);
    
    const hinh = await getFirstImage(c.FolderAnh);

    res.json({ ...c, HinhAnh: hinh, Days: daysSql, Total: total, DieuKhoan: terms });
  } catch (err) {
    console.error("Error GET /contracts/:mahd", err);
    res.status(500).json({ error: "Lỗi server khi lấy chi tiết hợp đồng" });
  }
});

/* Xe người dùng quan tâm  */
app.get("/user-interests/:cccd/:gplx", async (req, res) => {
  const { cccd, gplx } = req.params;
  try {
    // 1. Lấy 3 hãng xe/model/số chỗ
    const topFeatures = await queryAsync(
      `
      SELECT 
        M.HX_MAHANGXE, M.MODEL_SOGHE, M.MODEL_MAMODEL
      FROM QUAN_TAM Q
      JOIN XE X ON Q.XE_MAXE = X.XE_MAXE
      JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      WHERE Q.KH_SOCCCD = ? AND Q.KH_SOGPLX = ?
      GROUP BY M.HX_MAHANGXE, M.MODEL_SOGHE, M.MODEL_MAMODEL
      ORDER BY COUNT(Q.XE_MAXE) DESC
      LIMIT 3
      `,
      [cccd, gplx]
    );

    // 2. Fallback: Nếu không có lịch sử -> Lấy ngẫu nhiên
    if (!topFeatures || topFeatures.length === 0) {
      const rows = await queryAsync(
        `SELECT
           XE.XE_MAXE AS MaXe, XE.XE_BIENSOXE AS BienSo, MODEL.MODEL_TENMODEL AS TenModel,
           HANG_XE.HX_TENHANGXE AS HangXe, MODEL.MODEL_TRUYENDONG AS HopSo, MODEL.MODEL_SOGHE AS SoCho,
           MODEL.MODEL_NHIENLIEU AS NhienLieu, BG.BG_GIATHUETHEONGAY AS GiaThueNgay,
           (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
           CONCAT_WS(', ', D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP) AS DiaChi
         FROM XE
         JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
         JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
         LEFT JOIN BANG_GIA BG ON XE.XE_MAXE = BG.XE_MAXE AND (BG.BG_NGAYGIONGUNGAPDUNG IS NULL OR BG.BG_NGAYGIONGUNGAPDUNG > NOW())
         LEFT JOIN BAN_GHI_TINH_TRANG bg_current ON XE.XE_MAXE = bg_current.XE_MAXE AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW()) AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
         LEFT JOIN CHI_NHANH_THUE_XE CNTX ON bg_current.CNTX_MACNTX = CNTX.CNTX_MACNTX
         LEFT JOIN (SELECT DISTINCT XE_MAXE FROM BAN_GHI_TINH_TRANG WHERE TTX_MATTX = 3 AND BGTT_NGAYGIOKETTHUC IS NULL) bg_maint ON bg_maint.XE_MAXE = XE.XE_MAXE
         LEFT JOIN DUONG D ON CNTX.DUONG_MADUONG = D.DUONG_MADUONG
         LEFT JOIN PHUONG P ON D.PHUONG_MAPHUONG = P.PHUONG_MAPHUONG
         LEFT JOIN THANH_PHO T ON P.TP_MATP = T.TP_MATP
         WHERE bg_maint.XE_MAXE IS NULL
         
         -- (FIX) GROUP BY ĐẦY ĐỦ CÁC CỘT
         GROUP BY 
           XE.XE_MAXE, XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL, 
           HANG_XE.HX_TENHANGXE, MODEL.MODEL_TRUYENDONG, MODEL.MODEL_SOGHE, 
           MODEL.MODEL_NHIENLIEU, BG.BG_GIATHUETHEONGAY, DiaChi
           
         ORDER BY RAND() LIMIT 8`
      );
      const mapped = await Promise.all((rows || []).map(async (car) => {
        const hinhAnh = await getFirstImage(car.FolderAnh);
        return { ...car, HinhAnh: hinhAnh };
      }));
      return res.json(mapped);
    }

    const topBrand = topFeatures[0].HX_MAHANGXE;
    const topSeat = topFeatures[0].MODEL_SOGHE;
    
    const rows = await queryAsync(
      `SELECT
         XE.XE_MAXE AS MaXe, XE.XE_BIENSOXE AS BienSo, MODEL.MODEL_TENMODEL AS TenModel,
         HANG_XE.HX_TENHANGXE AS HangXe, MODEL.MODEL_TRUYENDONG AS HopSo, MODEL.MODEL_SOGHE AS SoCho,
         MODEL.MODEL_NHIENLIEU AS NhienLieu, BG.BG_GIATHUETHEONGAY AS GiaThueNgay,
         (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = XE.XE_MAXE LIMIT 1) AS FolderAnh,
         CONCAT_WS(', ', D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP) AS DiaChi,
         (
           (CASE WHEN MODEL.HX_MAHANGXE = ? THEN 10 ELSE 0 END) +
           (CASE WHEN MODEL.MODEL_SOGHE = ? THEN 5 ELSE 0 END)
         ) AS similarity_score
       FROM XE
       JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
       JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
       LEFT JOIN BANG_GIA BG ON XE.XE_MAXE = BG.XE_MAXE AND (BG.BG_NGAYGIONGUNGAPDUNG IS NULL OR BG.BG_NGAYGIONGUNGAPDUNG > NOW())
       LEFT JOIN BAN_GHI_TINH_TRANG bg_current ON XE.XE_MAXE = bg_current.XE_MAXE AND (bg_current.BGTT_NGAYGIOBATDAU IS NULL OR bg_current.BGTT_NGAYGIOBATDAU <= NOW()) AND (bg_current.BGTT_NGAYGIOKETTHUC IS NULL OR bg_current.BGTT_NGAYGIOKETTHUC > NOW())
       LEFT JOIN CHI_NHANH_THUE_XE CNTX ON bg_current.CNTX_MACNTX = CNTX.CNTX_MACNTX
       LEFT JOIN (SELECT DISTINCT XE_MAXE FROM BAN_GHI_TINH_TRANG WHERE TTX_MATTX = 3 AND BGTT_NGAYGIOKETTHUC IS NULL) bg_maint ON bg_maint.XE_MAXE = XE.XE_MAXE
       LEFT JOIN DUONG D ON CNTX.DUONG_MADUONG = D.DUONG_MADUONG
       LEFT JOIN PHUONG P ON D.PHUONG_MAPHUONG = P.PHUONG_MAPHUONG
       LEFT JOIN THANH_PHO T ON P.TP_MATP = T.TP_MATP
       WHERE bg_maint.XE_MAXE IS NULL
       
       -- (FIX) GROUP BY ĐẦY ĐỦ CÁC CỘT
       GROUP BY 
         XE.XE_MAXE, XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL, 
         HANG_XE.HX_TENHANGXE, MODEL.MODEL_TRUYENDONG, MODEL.MODEL_SOGHE, 
         MODEL.MODEL_NHIENLIEU, BG.BG_GIATHUETHEONGAY, DiaChi

       ORDER BY similarity_score DESC, RAND() 
       LIMIT 8`,
      [topBrand, topSeat]
    );

    const mapped = await Promise.all((rows || []).map(async (car) => {
      const hinhAnh = await getFirstImage(car.FolderAnh);
      return { ...car, HinhAnh: hinhAnh };
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Error /user-interests:", err);
    res.status(500).json({ error: "Lỗi khi lấy xe quan tâm" });
  }
});

/* Tạo hợp đồng */
app.post("/contracts", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  let connection;
  try {
    let {
      KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT,
      HDT_NGAYGIOBDTHUE, HDT_NGAYGIOKTTHUE, HDT_CHITIETHD,
    } = req.body;
    if (!KH_SOCCCD || !KH_SOGPLX || !XE_MAXE || !DKSDDV_MADKSDDV || !HDT_MAHDT || !HDT_NGAYGIOBDTHUE || !HDT_NGAYGIOKTTHUE) {
      return res.status(400).json({ error: "Thiếu thông tin hợp đồng (bắt buộc)" });
    }
    if (!CX_MACX) {
      const ownerRow = await queryAsync(`SELECT CX_MACX FROM BANG_GIA WHERE XE_MAXE = ? ORDER BY BG_NGAYGIOAPDUNG DESC LIMIT 1`, [XE_MAXE]);
      if (ownerRow && ownerRow.length > 0) CX_MACX = ownerRow[0].CX_MACX;
    }
    const toSqlDatetime = (v) => {
      if (!v) return null;
      if (v instanceof Date) {
        return v.toISOString().slice(0, 19).replace('T', ' ');
      }
      let s = String(v).trim().replace("T", " ");
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) s = s + ":00";
      return s.replace(/Z|[\+\-]\d{2}:\d{2}$/, "").trim();
    };
    const startSql = toSqlDatetime(HDT_NGAYGIOBDTHUE);
    const endSql = toSqlDatetime(HDT_NGAYGIOKTTHUE);
    const conflictRows = await queryAsync(
      `SELECT COUNT(1) AS cnt FROM BAN_GHI_TINH_TRANG
       WHERE XE_MAXE = ? AND TTX_MATTX = 2
         AND (BGTT_NGAYGIOBATDAU < ? AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > ?))`,
      [XE_MAXE, endSql, startSql]
    );
    if (conflictRows && conflictRows[0] && Number(conflictRows[0].cnt) > 0) {
      return res.status(409).json({ error: "Khoảng thời gian đã có hợp đồng. Không thể đặt chồng." });
    }
    if (db && typeof db.promise === "function" && typeof db.promise().getConnection === "function") {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      await connection.query(
        `INSERT INTO HOP_DONG_THUE
          (KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT, HDT_NGAYGIOBDTHUE, HDT_NGAYGIOKTTHUE, HDT_CHITIETHD, HDT_NGAYGIOLAPHOPDONG)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT, startSql, endSql, HDT_CHITIETHD]
      );
      let [cntxRow] = await connection.query(`SELECT CNTX_MACNTX FROM BAN_GHI_TINH_TRANG WHERE XE_MAXE = ? LIMIT 1`, [XE_MAXE]);
      if (!cntxRow || cntxRow.length === 0) {
        if (CX_MACX) {
          const [br] = await connection.query(`SELECT CNTX_MACNTX FROM CHI_NHANH_THUE_XE WHERE CX_MACX = ? LIMIT 1`, [CX_MACX]);
          if (br && br.length > 0) cntxRow = br;
        }
      }
      const cntx = (cntxRow && cntxRow[0] && cntxRow[0].CNTX_MACNTX) ? cntxRow[0].CNTX_MACNTX : null;
      if (cntx) {
        const [overlaps] = await connection.query(
          `SELECT CNTX_MACNTX, BGTT_NGAYGIOBATDAU AS startAt, BGTT_NGAYGIOKETTHUC AS endAt
           FROM BAN_GHI_TINH_TRANG
           WHERE XE_MAXE = ? AND TTX_MATTX = 1
             AND (BGTT_NGAYGIOBATDAU < ?)
             AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > ?)
           ORDER BY BGTT_NGAYGIOBATDAU`,
          [XE_MAXE, endSql, startSql]
        );
        for (const r of overlaps) {
          const origStart = r.startAt;
          const origEnd = r.endAt;
          if (new Date(origStart) < new Date(startSql)) {
            await connection.query(
              `UPDATE BAN_GHI_TINH_TRANG
               SET BGTT_NGAYGIOKETTHUC = ?
               WHERE XE_MAXE = ? AND TTX_MATTX = 1 AND CNTX_MACNTX = ? AND BGTT_NGAYGIOBATDAU = ?`,
              [startSql, XE_MAXE, r.CNTX_MACNTX, origStart]
            );
          } else {
            await connection.query(
              `DELETE FROM BAN_GHI_TINH_TRANG
               WHERE XE_MAXE = ? AND TTX_MATTX = 1 AND CNTX_MACNTX = ? AND BGTT_NGAYGIOBATDAU = ?`,
              [XE_MAXE, r.CNTX_MACNTX, origStart]
            );
          }
          if (origEnd === null || new Date(origEnd) > new Date(endSql)) {
            await connection.query(
              `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
               VALUES (?, 1, ?, ?, ?)`,
              [XE_MAXE, r.CNTX_MACNTX, endSql, origEnd]
            );
          }
        }
        await connection.query(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
           VALUES (?, 2, ?, ?, ?)`,
          [XE_MAXE, cntx, startSql, endSql]
        );
      }
      await connection.commit();
      if (connection) connection.release();
      return res.json({ ok: true, HDT_MAHDT, message: "Tạo hợp đồng thành công" });
    } else {
      // (Giữ nguyên fallback)
      await queryAsync(
        `INSERT INTO HOP_DONG_THUE
          (KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT, HDT_NGAYGIOBDTHUE, HDT_NGAYGIOKTTHUE, HDT_CHITIETHD, HDT_NGAYGIOLAPHOPDONG)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT, startSql, endSql, HDT_CHITIETHD]
      );
      let cntxRow = await queryAsync(`SELECT CNTX_MACNTX FROM BAN_GHI_TINH_TRANG WHERE XE_MAXE = ? LIMIT 1`, [XE_MAXE]);
      if (!cntxRow || cntxRow.length === 0) {
        if (CX_MACX) {
          const br = await queryAsync(`SELECT CNTX_MACNTX FROM CHI_NHANH_THUE_XE WHERE CX_MACX = ? LIMIT 1`, [CX_MACX]);
          if (br && br.length > 0) cntxRow = br;
        }
      }
      const cntx = (cntxRow && cntxRow[0] && cntxRow[0].CNTX_MACNTX) ? cntxRow[0].CNTX_MACNTX : null;
      if (cntx) {
        await queryAsync(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
           VALUES (?, 2, ?, ?, ?)`,
          [XE_MAXE, cntx, startSql, endSql]
        );
      }
      return res.json({ ok: true, HDT_MAHDT, message: "Tạo hợp đồng thành công (non-transactional)" });
    }
  } catch (err) {
    if (connection) {
      try { await connection.rollback(); connection.release(); } catch (e) {}
    }
    console.error("Error /contracts:", err);
    return res.status(500).json({ error: "Lỗi server khi tạo hợp đồng", detail: err.message });
  }
});

/* Hủy thuê xe  */
app.post("/rent-cancel/:mahd", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { mahd } = req.params;
  try {
    const rows = await queryAsync(`SELECT * FROM HOP_DONG_THUE WHERE HDT_MAHDT = ? LIMIT 1`, [mahd]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Không tìm thấy hợp đồng" });
    const c = rows[0];
    const xe = c.XE_MAXE;
    const start = c.HDT_NGAYGIOBDTHUE;
    const end = c.HDT_NGAYGIOKTTHUE;
    await queryAsync(`DELETE FROM HOP_DONG_THUE WHERE HDT_MAHDT = ?`, [mahd]);
    const bookings = await queryAsync(
      `SELECT CNTX_MACNTX, BGTT_NGAYGIOBATDAU AS startAt, BGTT_NGAYGIOKETTHUC AS endAt
       FROM BAN_GHI_TINH_TRANG
       WHERE XE_MAXE = ? AND TTX_MATTX = 2
         AND (BGTT_NGAYGIOBATDAU < ?) AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > ?)
       ORDER BY BGTT_NGAYGIOBATDAU`,
      [xe, end, start]
    );
    await queryAsync(
      `DELETE FROM BAN_GHI_TINH_TRANG
       WHERE XE_MAXE = ? AND TTX_MATTX = 2
         AND (BGTT_NGAYGIOBATDAU < ?) AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > ?)`,
      [xe, end, start]
    );
    const affectedCntx = Array.from(new Set((bookings || []).map(b => b.CNTX_MACNTX).filter(Boolean)));
    for (const cntx of affectedCntx) {
      await queryAsync(
        `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
         VALUES (?, 1, ?, ?, ?)`,
        [xe, cntx, start, end]
      );
      const avails = await queryAsync(
        `SELECT BGTT_NGAYGIOBATDAU AS startAt, BGTT_NGAYGIOKETTHUC AS endAt
         FROM BAN_GHI_TINH_TRANG
         WHERE XE_MAXE = ? AND TTX_MATTX = 1 AND CNTX_MACNTX = ?
         ORDER BY BGTT_NGAYGIOBATDAU`,
        [xe, cntx]
      );
      if (avails && avails.length) {
        const merged = [];
        for (const a of avails) {
          const s = a.startAt;
          const e = a.endAt;
          if (merged.length === 0) { merged.push({ start: s, end: e }); continue; }
          const last = merged[merged.length - 1];
          if (last.end === null) continue;
          if (e === null) { last.end = null; continue; }
          if (new Date(s) <= new Date(last.end)) {
            last.end = new Date(e) > new Date(last.end) ? e : last.end;
          } else {
            merged.push({ start: s, end: e });
          }
        }
        await queryAsync(
          `DELETE FROM BAN_GHI_TINH_TRANG WHERE XE_MAXE = ? AND TTX_MATTX = 1 AND CNTX_MACNTX = ?`,
          [xe, cntx]
        );
        for (const m of merged) {
          await queryAsync(
            `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
             VALUES (?, 1, ?, ?, ?)`,
            [xe, cntx, m.start, m.end]
          );
        }
      }
    }
    res.json({ message: "Hủy hợp đồng và cập nhật trạng thái xe" });
  } catch (err) {
    console.error("Error /rent-cancel:", err);
    res.status(500).json({ error: "Không thể hủy hợp đồng", detail: err.message });
  }
});

/* Đăng ký Khách hàng  */
app.post("/register", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const {
    KH_SOCCCD, KH_SOGPLX, KH_TENND, KH_GIOITINH = "", KH_NGAYSINH, KH_TENTAIKHOAN,
    KH_MATKHAU, KH_SODIENTHOAI, KH_EMAIL, KH_SOTK = "", KH_TENNGANHANG = ""
  } = req.body;
  if (!KH_SOCCCD || !KH_SOGPLX || !KH_TENND || !KH_GIOITINH || !KH_NGAYSINH || !KH_TENTAIKHOAN || !KH_MATKHAU || !KH_SODIENTHOAI || !KH_EMAIL) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }
  try {
    const exists = await queryAsync(
      `SELECT KH_SOCCCD, KH_SOGPLX, KH_TENTAIKHOAN FROM KHACH_HANG WHERE KH_SOCCCD = ? OR KH_SOGPLX = ? OR KH_TENTAIKHOAN = ? LIMIT 1`,
      [KH_SOCCCD, KH_SOGPLX, KH_TENTAIKHOAN]
    );
    if (exists && exists.length > 0) {
      if (exists[0].KH_SOCCCD === KH_SOCCCD) return res.status(400).json({ error: "CCCD đã được đăng ký" });
      if (exists[0].KH_SOGPLX === KH_SOGPLX) return res.status(400).json({ error: "Số GPLX đã được đăng ký" });
      if (exists[0].KH_TENTAIKHOAN === KH_TENTAIKHOAN) return res.status(400).json({ error: "Tên tài khoản đã tồn tại" });
      return res.status(400).json({ error: "Tài khoản đã tồn tại" });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(KH_MATKHAU, salt);
    const dob = KH_NGAYSINH ? KH_NGAYSINH : null;
    await queryAsync(
      `INSERT INTO KHACH_HANG
       (KH_SOCCCD, KH_SOGPLX, KH_TENND, KH_GIOITINH, KH_NGAYSINH, KH_TENTAIKHOAN, KH_MATKHAU, KH_SODIENTHOAI, KH_EMAIL, KH_SOTK, KH_TENNGANHANG)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [KH_SOCCCD, KH_SOGPLX, KH_TENND, KH_GIOITINH, dob, KH_TENTAIKHOAN, hash, KH_SODIENTHOAI, KH_EMAIL, KH_SOTK || "", KH_TENNGANHANG || ""]
    );
    res.json({ ok: true, message: "Đăng ký thành công" });
  } catch (err) {
    console.error("Error /register:", err);
    res.status(500).json({ error: "Lỗi server khi đăng ký" });
  }
});

/* Đăng nhập Khách hàng  */
app.post("/login", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { KH_TENTAIKHOAN, KH_MATKHAU } = req.body;
  if (!KH_TENTAIKHOAN || !KH_MATKHAU) return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
  try {
    const rows = await queryAsync(
      `SELECT * FROM KHACH_HANG WHERE KH_TENTAIKHOAN = ? LIMIT 1`,
      [KH_TENTAIKHOAN]
    );
    if (!rows || rows.length === 0) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    const user = rows[0];
    const match = user.KH_MATKHAU === KH_MATKHAU || (await bcrypt.compare(KH_MATKHAU, user.KH_MATKHAU));
    if (!match) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    const safeUser = {
      KH_SOCCCD: user.KH_SOCCCD, KH_SOGPLX: user.KH_SOGPLX, KH_TENND: user.KH_TENND,
      KH_GIOITINH: user.KH_GIOITINH, KH_NGAYSINH: user.KH_NGAYSINH, KH_TENTAIKHOAN: user.KH_TENTAIKHOAN,
      KH_SODIENTHOAI: user.KH_SODIENTHOAI, KH_EMAIL: user.KH_EMAIL, KH_SOTK: user.KH_SOTK || "",
      KH_TENNGANHANG: user.KH_TENNGANHANG || ""
    };
    res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("Error /login:", err);
    res.status(500).json({ error: "Lỗi server khi đăng nhập" });
  }
});

/* Cập nhật hồ sơ Khách hàng  */
app.post("/update-profile/:cccd/:gplx", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { cccd, gplx } = req.params;
  const { KH_TENND, KH_EMAIL, KH_SODIENTHOAI, KH_MATKHAU, KH_SOTK, KH_TENNGANHANG } = req.body;
  try {
    await queryAsync(
      `UPDATE KHACH_HANG SET KH_TENND = ?, KH_EMAIL = ?, KH_SODIENTHOAI = ? WHERE KH_SOCCCD = ? AND KH_SOGPLX = ?`,
      [KH_TENND, KH_EMAIL, KH_SODIENTHOAI, cccd, gplx]
    );
    if (typeof KH_SOTK !== "undefined" || typeof KH_TENNGANHANG !== "undefined") {
      await queryAsync(`UPDATE KHACH_HANG SET KH_SOTK = ?, KH_TENNGANHANG = ? WHERE KH_SOCCCD = ? AND KH_SOGPLX = ?`, [KH_SOTK || "", KH_TENNGANHANG || "", cccd, gplx]);
    }
    if (KH_MATKHAU && KH_MATKHAU.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(KH_MATKHAU, salt);
      await queryAsync(`UPDATE KHACH_HANG SET KH_MATKHAU = ? WHERE KH_SOCCCD = ? AND KH_SOGPLX = ?`, [hash, cccd, gplx]);
    }
    res.json({ ok: true, message: "Cập nhật thông tin thành công" });
  } catch (err) {
    console.error("Error /update-profile:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật thông tin" });
  }
});

/* Lưu ảnh Hợp đồng (Không đổi) */
app.post("/save-contract-image", async (req, res) => {
  // (Giữ nguyên logic của bạn, nhưng dùng fs.promises)
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });
    const safeName = (filename && String(filename).replace(/[^a-zA-Z0-9_.-]/g, "_")) || `contract_${Date.now()}.png`;
    const targetDir = path.join(__dirname, "HopDong");
    await fs.mkdir(targetDir, { recursive: true }); // Dùng fs.promises
    const m = String(imageBase64).match(/^data:(image\/\w+);base64,(.*)$/);
    const b64 = m ? m[2] : imageBase64;
    const buffer = Buffer.from(b64, "base64");
    const outPath = path.join(targetDir, safeName);
    await fs.writeFile(outPath, buffer); // Dùng fs.promises
    return res.json({ ok: true, path: outPath, filename: safeName });
  } catch (err) {
    console.error("Error /save-contract-image:", err);
    res.status(500).json({ error: "Không thể lưu ảnh hợp đồng", detail: err.message });
  }
});

/* Ghi nhận lượt xem xe */
app.post("/views", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  try {
    const { KH_SOCCCD, KH_SOGPLX, XE_MAXE } = req.body;
    if (!KH_SOCCCD || !KH_SOGPLX || !XE_MAXE) return res.status(400).json({ error: "Thiếu thông tin view" });
    try {
      await queryAsync(
        `INSERT INTO QUAN_TAM (KH_SOCCCD, KH_SOGPLX, XE_MAXE, QT_THOIDIEMXEM)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE QT_THOIDIEMXEM = VALUES(QT_THOIDIEMXEM)`,
        [KH_SOCCCD, KH_SOGPLX, XE_MAXE]
      );
    } catch (e) {
      try {
        await queryAsync(
          `REPLACE INTO QUAN_TAM (KH_SOCCCD, KH_SOGPLX, XE_MAXE, QT_THOIDIEMXEM)
           VALUES (?, ?, ?, NOW())`,
          [KH_SOCCCD, KH_SOGPLX, XE_MAXE]
        );
      } catch (err) {
        console.warn("Warning: unable to upsert QUAN_TAM", err.message);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Error /views:", err);
    res.status(500).json({ error: "Lỗi server khi ghi view" });
  }
});

/* Lấy ngày đã đặt  */
app.get("/car-bookings/:id", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const carId = req.params.id;
  try {
    const sql = `
      SELECT BGTT_NGAYGIOBATDAU AS startAt, BGTT_NGAYGIOKETTHUC AS endAt
      FROM BAN_GHI_TINH_TRANG
      WHERE XE_MAXE = ? AND TTX_MATTX = 2
        AND BGTT_NGAYGIOKETTHUC IS NOT NULL
      ORDER BY BGTT_NGAYGIOBATDAU ASC
    `;
    const rows = await queryAsync(sql, [carId]);
    res.json(rows || []);
  } catch (err) {
    console.error("Error /car-bookings:", err);
    res.status(500).json({ error: "Không thể lấy danh sách ngày đã thuê" });
  }
});

/* Đăng ký Chủ xe  */
app.post("/register-owner", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  console.log("[POST] /register-owner – Nhận yêu cầu:", req.body);
  const { CX_HOTENCX, CX_SODT, CX_EMAIL, CX_STK, CX_NGANHANG, CX_TENTAIKHOAN, CX_MATKHAU } = req.body;
  try {
    console.log("🔍 Kiểm tra dữ liệu đầu vào...");
    if (!CX_HOTENCX || !CX_SODT || !CX_EMAIL || !CX_STK || !CX_NGANHANG || !CX_TENTAIKHOAN || !CX_MATKHAU) {
      console.warn("⚠️ Thiếu thông tin bắt buộc!");
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
    }
    console.log("🔎 Kiểm tra tài khoản trùng...");
    const exists = await queryAsync(
      `SELECT CX_TENTAIKHOAN FROM CHU_XE WHERE CX_TENTAIKHOAN = ? LIMIT 1`,
      [CX_TENTAIKHOAN]
    );
    if (exists && exists.length > 0) {
      console.warn("⚠️ Tên tài khoản đã tồn tại:", CX_TENTAIKHOAN);
      return res.status(400).json({ error: "Tên tài khoản đã tồn tại" });
    }
    console.log("🔐 Hash mật khẩu...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(CX_MATKHAU, salt);
    console.log("🧮 Tạo mã chủ xe tự tăng...");
    const last = await queryAsync("SELECT CX_MACX FROM CHU_XE ORDER BY CX_MACX DESC LIMIT 1");
    const nextId = last.length > 0 ? last[0].CX_MACX + 1 : 1;
    console.log("✅ Mã chủ xe mới:", nextId);
    console.log("📝 Thêm chủ xe mới vào CSDL...");
    await queryAsync(
      `INSERT INTO CHU_XE (CX_MACX, CX_HOTENCX, CX_SODT, CX_EMAIL, CX_STK, CX_NGANHANG, CX_TENTAIKHOAN, CX_MATKHAU)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId, CX_HOTENCX, CX_SODT, CX_EMAIL, CX_STK, CX_NGANHANG, CX_TENTAIKHOAN, hash]
    );
    console.log("🎉 Đăng ký chủ xe thành công!");
    res.json({ ok: true, message: "Đăng ký chủ xe thành công" });
  } catch (err) {
    console.error("❌ Lỗi /register-owner:", err);
    res.status(500).json({ error: "Lỗi server khi đăng ký chủ xe" });
  }
});

/* Đăng nhập Chủ xe */
app.post("/login-owner", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  console.log("🟢 [POST] /login-owner – Nhận yêu cầu:", req.body);
  const { CX_TENTAIKHOAN, CX_MATKHAU } = req.body;
  try {
    if (!CX_TENTAIKHOAN || !CX_MATKHAU) {
      console.warn("⚠️ Thiếu tài khoản hoặc mật khẩu");
      return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    }
    console.log("🔎 Kiểm tra tài khoản:", CX_TENTAIKHOAN);
    const rows = await queryAsync(
      `SELECT * FROM CHU_XE WHERE CX_TENTAIKHOAN = ? LIMIT 1`,
      [CX_TENTAIKHOAN]
    );
    if (!rows || rows.length === 0) {
      console.warn("⚠️ Không tìm thấy tài khoản:", CX_TENTAIKHOAN);
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
    const owner = rows[0];
    console.log("✅ Tìm thấy chủ xe:", owner.CX_HOTENCX);
    console.log("🔐 Đang kiểm tra mật khẩu...");
    const match = owner.CX_MATKHAU === CX_MATKHAU || (await bcrypt.compare(CX_MATKHAU, owner.CX_MATKHAU));
    if (!match) {
      console.warn("❌ Mật khẩu không đúng cho tài khoản:", CX_TENTAIKHOAN);
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
    console.log("🎉 Đăng nhập thành công!");
    res.json({
      ok: true,
      owner: {
        CX_MACX: owner.CX_MACX, CX_HOTENCX: owner.CX_HOTENCX, CX_SODT: owner.CX_SODT,
        CX_EMAIL: owner.CX_EMAIL, CX_STK: owner.CX_STK, CX_TENNGANHANG: owner.CX_TENNGANHANG,
        CX_TENTAIKHOAN: owner.CX_TENTAIKHOAN
      }
    });
  } catch (err) {
    console.error("❌ Lỗi /login-owner:", err);
    res.status(500).json({ error: "Lỗi server khi đăng nhập chủ xe" });
  }
});

/* Lấy xe của Chủ xe  */
app.get("/owner/:macx/cars", async (req, res) => {
  // (GiÃ nguyên logic cá»§a báº¡n)
  try {
    const { macx } = req.params;
    const cars = await queryAsync(
      `SELECT XE.XE_MAXE, XE.XE_BIENSOXE, MODEL.MODEL_TENMODEL, HX_TENHANGXE
       FROM XE
       JOIN MODEL ON XE.MODEL_MAMODEL = MODEL.MODEL_MAMODEL
       JOIN HANG_XE ON MODEL.HX_MAHANGXE = HANG_XE.HX_MAHANGXE
       WHERE EXISTS (
         SELECT 1 FROM BANG_GIA WHERE BANG_GIA.XE_MAXE = XE.XE_MAXE AND BANG_GIA.CX_MACX = ?
       )`,
      [macx]
    );
    res.json({ ok: true, cars });
  } catch (err) {
    console.error("Error /owner/:macx/cars:", err);
    res.status(500).json({ error: "Lỗi khi lấy danh sách xe" });
  }
});

/* Lấy hợp đồng của Chủ xe  */
// app.get("/owner/:macx/contracts", async (req, res) => {
//   try {
//     const { macx } = req.params;
//     const rows = await queryAsync(
//       `SELECT HDT_MAHDT, KH_TENND, XE.XE_BIENSOXE, HDT_NGAYGIOBDTHUE, HDT_NGAYGIOKTTHUE, HDT_NGAYGIOLAPHOPDONG
//        FROM HOP_DONG_THUE
//        JOIN KHACH_HANG ON HOP_DONG_THUE.KH_SOCCCD = KHACH_HANG.KH_SOCCCD
//        JOIN XE ON HOP_DONG_THUE.XE_MAXE = XE.XE_MAXE
//        WHERE HOP_DONG_THUE.CX_MACX = ?`,
//       [macx]
//     );
//     res.json({ ok: true, contracts: rows });
//   } catch (err) {
//     console.error("Error /owner/:macx/contracts:", err);
//     res.status(500).json({ error: "Lỗi khi lấy hợp đồng" });
//   }
// });

/* Lấy chi nhánh của Chủ xe  */
app.get("/owner/:ownerId/branches", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const ownerId = req.params.ownerId;
  try {
    const rows = await queryAsync(
      `
      SELECT c.*, 
             d.DUONG_TENDUONG, 
             p.PHUONG_TENPHUONG, 
             t.TP_TENTP
      FROM CHI_NHANH_THUE_XE c
      LEFT JOIN DUONG d ON c.DUONG_MADUONG = d.DUONG_MADUONG
      LEFT JOIN PHUONG p ON d.PHUONG_MAPHUONG = p.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO t ON p.TP_MATP = t.TP_MATP
      WHERE c.CX_MACX = ?
      `,
      [ownerId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi /owner/:ownerId/branches:", err);
    res.status(500).json({ error: "Lỗi khi tải chi nhánh." });
  }
});

/* Lấy chi tiết chi nhánh  */
app.get("/branches/:cntxId", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const id = req.params.cntxId;
  try {
    const rows = await queryAsync(
      `
      SELECT c.*, 
             d.DUONG_TENDUONG, 
             p.PHUONG_TENPHUONG, 
             t.TP_TENTP
      FROM CHI_NHANH_THUE_XE c
      LEFT JOIN DUONG d ON c.DUONG_MADUONG = d.DUONG_MADUONG
      LEFT JOIN PHUONG p ON d.PHUONG_MAPHUONG = p.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO t ON p.TP_MATP = t.TP_MATP
      WHERE c.CNTX_MACNTX = ?
      `,
      [id]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Lỗi /branches/:cntxId:", err);
    res.status(500).json({ error: "Không thể tải chi nhánh." });
  }
});

/* Lấy xe trong chi nhánh  */
app.get("/branches/:cntxId/cars", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const id = req.params.cntxId;
  try {
    const rows = await queryAsync(
      `
        SELECT 
          x.XE_MAXE AS MaXe, x.XE_BIENSOXE AS BienSo, m.MODEL_TENMODEL AS TenModel,
          tt.TTX_TENTINHTRANG AS TrangThai
        FROM XE x
        JOIN MODEL m ON x.MODEL_MAMODEL = m.MODEL_MAMODEL
        JOIN BAN_GHI_TINH_TRANG bg ON x.XE_MAXE = bg.XE_MAXE
        JOIN TINH_TRANG_XE tt ON bg.TTX_MATTX = tt.TTX_MATTX
        WHERE 
          bg.CNTX_MACNTX = ?
          AND (bg.BGTT_NGAYGIOBATDAU IS NULL OR bg.BGTT_NGAYGIOBATDAU <= NOW())
          AND (bg.BGTT_NGAYGIOKETTHUC IS NULL OR bg.BGTT_NGAYGIOKETTHUC > NOW())
        GROUP BY 
          x.XE_MAXE, x.XE_BIENSOXE, m.MODEL_TENMODEL, tt.TTX_TENTINHTRANG
      `,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi /branches/:cntxId/cars:", err);
    res.status(500).json({ error: "Không thể tải danh sách xe." });
  }
});

/* Đảm bảo địa chỉ  */
app.post("/locations/ensure", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { tpName, phuongName, duongName } = req.body;
  try {
    let tpId;
    const tpExists = await queryAsync("SELECT TP_MATP FROM THANH_PHO WHERE TP_TENTP = ?", [tpName]);
    if (tpExists.length > 0) { tpId = tpExists[0].TP_MATP; }
    else {
      tpId = "TP" + Date.now().toString().slice(-2);
      await queryAsync("INSERT INTO THANH_PHO (TP_MATP, TP_TENTP) VALUES (?, ?)", [tpId, tpName]);
    }
    let phuongId;
    const phuongExists = await queryAsync(
      "SELECT PHUONG_MAPHUONG FROM PHUONG WHERE PHUONG_TENPHUONG = ? AND TP_MATP = ?",
      [phuongName, tpId]
    );
    if (phuongExists.length > 0) { phuongId = phuongExists[0].PHUONG_MAPHUONG; }
    else {
      phuongId = "P" + Date.now().toString().slice(-3);
      await queryAsync("INSERT INTO PHUONG (PHUONG_MAPHUONG, PHUONG_TENPHUONG, TP_MATP) VALUES (?, ?, ?)", [
        phuongId, phuongName, tpId,
      ]);
    }
    let duongId;
    const duongExists = await queryAsync(
      "SELECT DUONG_MADUONG FROM DUONG WHERE DUONG_TENDUONG = ? AND PHUONG_MAPHUONG = ?",
      [duongName, phuongId]
    );
    if (duongExists.length > 0) { duongId = duongExists[0].DUONG_MADUONG; }
    else {
      duongId = "D" + Date.now().toString().slice(-3);
      await queryAsync("INSERT INTO DUONG (DUONG_MADUONG, DUONG_TENDUONG, PHUONG_MAPHUONG) VALUES (?, ?, ?)", [
        duongId, duongName, phuongId,
      ]);
    }
    res.json({
      duongId: duongId, phuongId: phuongId, tpId: tpId,
      addressText: `${duongName}, ${phuongName}, ${tpName}`,
    });
  } catch (err) {
    console.error("Lỗi /locations/ensure:", err);
    res.status(500).json({ error: "Không thể xử lý địa chỉ." });
  }
});

/* Cập nhật vị trí chi nhánh  */
app.post("/branches/:cntxId/update-location", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const id = req.params.cntxId;
  const { lat, lng, DUONG_MADUONG, addressText } = req.body; 
  try {
    await queryAsync(
      `
      UPDATE CHI_NHANH_THUE_XE
      SET CNTX_LATITUDE = ?, CNTX_LONGTITUDE = ?, DUONG_MADUONG = ?, CNTX_SODIACHI = ?
      WHERE CNTX_MACNTX = ?
      `,
      [lat, lng, DUONG_MADUONG, addressText || `Cập nhật tại ${new Date().toISOString()}`, id]
    );
    res.json({ ok: true, message: "Cập nhật vị trí thành công" });
  } catch (err) {
    console.error("Lỗi /branches/:cntxId/update-location:", err);
    res.status(500).json({ error: "Không thể cập nhật vị trí chi nhánh." });
  }
});

/* Thêm chi nhánh  */
app.post("/owner/:ownerId/branches", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { ownerId } = req.params;
  const { soDiaChi, lat, lng, tpName, phuongName, duongName } = req.body;
  if (!ownerId || !soDiaChi || !lat || !lng || !tpName || !phuongName || !duongName) {
    return res.status(400).json({ error: "Thiếu thông tin chi nhánh (địa chỉ, tọa độ, tên đường/phường/TP)" });
  }
  let connection;
  try {
    if (db && typeof db.promise === "function" && typeof db.promise().getConnection === "function") {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      let tpId;
      const [tpExists] = await connection.query("SELECT TP_MATP FROM THANH_PHO WHERE TP_TENTP = ?", [tpName]);
      if (tpExists.length > 0) tpId = tpExists[0].TP_MATP;
      else {
        tpId = "TP" + Date.now().toString().slice(-2); 
        await connection.query("INSERT INTO THANH_PHO (TP_MATP, TP_TENTP) VALUES (?, ?)", [tpId, tpName]);
      }
      let phuongId;
      const [phuongExists] = await connection.query("SELECT PHUONG_MAPHUONG FROM PHUONG WHERE PHUONG_TENPHUONG = ? AND TP_MATP = ?", [phuongName, tpId]);
      if (phuongExists.length > 0) phuongId = phuongExists[0].PHUONG_MAPHUONG;
      else {
        phuongId = "P" + Date.now().toString().slice(-3);
        await connection.query("INSERT INTO PHUONG (PHUONG_MAPHUONG, PHUONG_TENPHUONG, TP_MATP) VALUES (?, ?, ?)", [phuongId, phuongName, tpId]);
      }
      let duongId;
      const [duongExists] = await connection.query("SELECT DUONG_MADUONG FROM DUONG WHERE DUONG_TENDUONG = ? AND PHUONG_MAPHUONG = ?", [duongName, phuongId]);
      if (duongExists.length > 0) duongId = duongExists[0].DUONG_MADUONG;
      else {
        duongId = "D" + Date.now().toString().slice(-3);
        await connection.query("INSERT INTO DUONG (DUONG_MADUONG, DUONG_TENDUONG, PHUONG_MAPHUONG) VALUES (?, ?, ?)", [duongId, duongName, phuongId]);
      }
      const [last] = await connection.query("SELECT MAX(CNTX_MACNTX) as maxId FROM CHI_NHANH_THUE_XE");
      const nextId = (last[0].maxId || 0) + 1;
      await connection.query(
        `INSERT INTO CHI_NHANH_THUE_XE 
         (CNTX_MACNTX, CX_MACX, DUONG_MADUONG, CNTX_SODIACHI, CNTX_LONGTITUDE, CNTX_LATITUDE)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nextId, ownerId, duongId, soDiaChi, lng, lat]
      );
      await connection.commit();
      res.json({ ok: true, message: "Thêm chi nhánh thành công", newBranchId: nextId });
    } else {
      console.warn("Đang thêm chi nhánh (non-transactional) vì db connection không hỗ trợ promise().");
      let tpId;
      const tpExists = await queryAsync("SELECT TP_MATP FROM THANH_PHO WHERE TP_TENTP = ?", [tpName]);
      if (tpExists.length > 0) tpId = tpExists[0].TP_MATP;
      else {
        tpId = "TP" + Date.now().toString().slice(-2);
        await queryAsync("INSERT INTO THANH_PHO (TP_MATP, TP_TENTP) VALUES (?, ?)", [tpId, tpName]);
      }
      let phuongId;
      const phuongExists = await queryAsync("SELECT PHUONG_MAPHUONG FROM PHUONG WHERE PHUONG_TENPHUONG = ? AND TP_MATP = ?", [phuongName, tpId]);
      if (phuongExists.length > 0) phuongId = phuongExists[0].PHUONG_MAPHUONG;
      else {
        phuongId = "P" + Date.now().toString().slice(-3);
        await queryAsync("INSERT INTO PHUONG (PHUONG_MAPHUONG, PHUONG_TENPHUONG, TP_MATP) VALUES (?, ?, ?)", [phuongId, phuongName, tpId]);
      }
      let duongId;
      const duongExists = await queryAsync("SELECT DUONG_MADUONG FROM DUONG WHERE DUONG_TENDUONG = ? AND PHUONG_MAPHUONG = ?", [duongName, phuongId]);
      if (duongExists.length > 0) duongId = duongExists[0].DUONG_MADUONG;
      else {
        duongId = "D" + Date.now().toString().slice(-3);
        await queryAsync("INSERT INTO DUONG (DUONG_MADUONG, DUONG_TENDUONG, PHUONG_MAPHUONG) VALUES (?, ?, ?)", [duongId, duongName, phuongId]);
      }
      const last = await queryAsync("SELECT MAX(CNTX_MACNTX) as maxId FROM CHI_NHANH_THUE_XE");
      const nextId = (last[0].maxId || 0) + 1;
      await queryAsync(
        `INSERT INTO CHI_NHANH_THUE_XE 
         (CNTX_MACNTX, CX_MACX, DUONG_MADUONG, CNTX_SODIACHI, CNTX_LONGTITUDE, CNTX_LATITUDE)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nextId, ownerId, duongId, soDiaChi, lng, lat]
      );
      res.json({ ok: true, message: "Thêm chi nhánh thành công (non-transactional)", newBranchId: nextId });
    }
  } catch (err) {
    if (connection) await connection.rollback(); 
    console.error("Lỗi POST /owner/:ownerId/branches:", err);
    res.status(500).json({ error: "Không thể thêm chi nhánh." });
  } finally {
    if (connection) connection.release(); 
  }
});

/* Lấy dữ liệu phụ trợ  */
app.get("/owner-helpers/:ownerId", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { ownerId } = req.params;
  try {
    const branches = await queryAsync(
      "SELECT CNTX_MACNTX, CNTX_SODIACHI FROM CHI_NHANH_THUE_XE WHERE CX_MACX = ?", 
      [ownerId]
    );
    const models = await queryAsync(
      `SELECT m.MODEL_MAMODEL, m.MODEL_TENMODEL, h.HX_TENHANGXE 
       FROM MODEL m 
       JOIN HANG_XE h ON m.HX_MAHANGXE = h.HX_MAHANGXE
       ORDER BY h.HX_TENHANGXE, m.MODEL_TENMODEL`
    );
    const statuses = await queryAsync("SELECT TTX_MATTX, TTX_TENTINHTRANG FROM TINH_TRANG_XE");
    res.json({ branches, models, statuses });
  } catch (err) {
    console.error("Lỗi /owner-helpers:", err);
    res.status(500).json({ error: "Lỗi khi tải dữ liệu phụ trợ." });
  }
});

//  LẤY DANH SÁCH XE 
app.get("/owner/:ownerId/cars-with-status", async (req, res) => {
  const { ownerId } = req.params;
  // (MỚI) Lấy tham số phân trang
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10; // Mặc định 10 xe/trang
  const offset = (page - 1) * pageSize;

  try {
    // (MỚI) Câu SQL điều kiện WHERE (dùng cho cả 2 query)
    const whereSql = `
      WHERE EXISTS (
        SELECT 1 FROM BANG_GIA bg_check 
        WHERE bg_check.XE_MAXE = X.XE_MAXE AND bg_check.CX_MACX = ?
      )
    `;

    // (MỚI) Query 1: Đếm tổng số xe
    const countSql = `
      SELECT COUNT(DISTINCT X.XE_MAXE) AS total
      FROM XE X
      ${whereSql}
    `;
    const countRows = await queryAsync(countSql, [ownerId]);
    const totalCars = countRows[0]?.total || 0;

    // (SỬA) Query 2: Lấy dữ liệu xe (thêm LIMIT/OFFSET)
    const sql = `
      SELECT 
        X.XE_MAXE, 
        X.XE_BIENSOXE, 
        M.MODEL_TENMODEL, 
        H.HX_TENHANGXE,
        BG.BG_GIATHUETHEONGAY,
        TIX.*,
        BGTT_current.TTX_MATTX AS TinhTrangHienTai_ID,
        TTX.TTX_TENTINHTRANG AS TinhTrangHienTai_Ten,
        BGTT_current.CNTX_MACNTX AS ChiNhanhHienTai_ID,
        CONCAT_WS(', ', CNTX.CNTX_SODIACHI, D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP) AS ChiNhanhHienTai_Ten
      FROM XE X
      JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
      LEFT JOIN TIEN_ICH_XE TIX ON X.XE_MAXE = TIX.XE_MAXE
      LEFT JOIN BANG_GIA BG ON X.XE_MAXE = BG.XE_MAXE 
        AND BG.CX_MACX = ? -- Param 1
        AND (BG.BG_NGAYGIONGUNGAPDUNG IS NULL OR BG.BG_NGAYGIONGUNGAPDUNG > NOW())
      LEFT JOIN BAN_GHI_TINH_TRANG BGTT_current 
        ON X.XE_MAXE = BGTT_current.XE_MAXE
        AND (BGTT_current.BGTT_NGAYGIOBATDAU IS NULL OR BGTT_current.BGTT_NGAYGIOBATDAU <= NOW())
        AND (BGTT_current.BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_current.BGTT_NGAYGIOKETTHUC > NOW())
      LEFT JOIN TINH_TRANG_XE TTX ON BGTT_current.TTX_MATTX = TTX.TTX_MATTX
      LEFT JOIN CHI_NHANH_THUE_XE CNTX ON BGTT_current.CNTX_MACNTX = CNTX.CNTX_MACNTX
      LEFT JOIN DUONG D ON CNTX.DUONG_MADUONG = D.DUONG_MADUONG
      LEFT JOIN PHUONG P ON D.PHUONG_MAPHUONG = P.PHUONG_MAPHUONG
      LEFT JOIN THANH_PHO T ON P.TP_MATP = T.TP_MATP
      ${whereSql.replace('?', ' ? ')} -- Param 2
      GROUP BY X.XE_MAXE, M.MODEL_TENMODEL, H.HX_TENHANGXE, BG.BG_GIATHUETHEONGAY, 
               BGTT_current.TTX_MATTX, TTX.TTX_TENTINHTRANG, BGTT_current.CNTX_MACNTX, 
               CNTX.CNTX_SODIACHI, D.DUONG_TENDUONG, P.PHUONG_TENPHUONG, T.TP_TENTP
      ORDER BY X.XE_MAXE DESC
      LIMIT ? OFFSET ? -- Param 3 và 4
    `;
    
    const cars = await queryAsync(sql, [ownerId, ownerId, pageSize, offset]);
    
    // (MỚI) Trả về object
    res.json({ items: cars, total: totalCars });

  } catch (err) {
    console.error("Lỗi /owner/:ownerId/cars-with-status:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách xe." });
  }
});

//  THÊM XE MỚI 
app.post("/owner/:ownerId/cars", upload.array('images', 10), async (req, res) => {
  const { ownerId } = req.params;
  const {
    bienSo, modelId, giaThue, chiNhanhId, // Text fields
    features // JSON string
  } = req.body;
  const files = req.files;

  // (MỚI) Hàm helper để dọn dẹp file tạm khi có lỗi
  const cleanupFiles = async () => {
    if (files) {
      for (const file of files) {
        try { await fs.unlink(file.path); } catch(e) {}
      }
    }
  };

  // 1. Kiểm tra file (yêu cầu tối thiểu 4)
  if (!files || files.length < 4) {
    await cleanupFiles(); // Dọn file tạm
    return res.status(400).json({ error: "Phải tải lên tối thiểu 4 hình ảnh." });
  }

  // 2. Kiểm tra thiếu thông tin
  if (!bienSo || !modelId || !giaThue || !chiNhanhId) {
    await cleanupFiles(); // Dọn file tạm
    return res.status(400).json({ error: "Thiếu thông tin xe, model, giá hoặc chi nhánh." });
  }

  // 3. (MỚI) Kiểm tra biển số trùng lặp
  try {
    const existingPlate = await queryAsync("SELECT XE_MAXE FROM XE WHERE XE_BIENSOXE = ?", [bienSo]);
    if (existingPlate.length > 0) {
      await cleanupFiles(); // Dọn file tạm
      return res.status(400).json({ error: `Biển số xe ${bienSo} đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.` });
    }
  } catch (err) {
    await cleanupFiles(); // Dọn file tạm
    console.error("Lỗi kiểm tra biển số:", err);
    return res.status(500).json({ error: "Lỗi server khi kiểm tra biển số." });
  }
  
  // === Nếu vượt qua các bước kiểm tra, bắt đầu thêm xe ===

  let connection;
  let newXeMaXe = '';
  let relativeDbPath = '';
  let targetDir = '';

  try {
    // === BẮT ĐẦU LOGIC CHUNG (Lấy ID và Đường dẫn) ===
    // A. Lấy Tên Hãng và Model để tạo đường dẫn
    const modelInfo = await queryAsync(
      `SELECT M.MODEL_TENMODEL, H.HX_TENHANGXE 
       FROM MODEL M 
       JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE 
       WHERE M.MODEL_MAMODEL = ?`,
      [modelId]
    );
    if (!modelInfo || modelInfo.length === 0) {
      throw new Error("Không tìm thấy model xe.");
    }
    const hangXe = modelInfo[0].HX_TENHANGXE;
    const modelTen = modelInfo[0].MODEL_TENMODEL;
    const modelParts = modelTen.split(' ');
    const parentFolder = modelParts[0] || modelTen;

    // B. Kiểm tra xem DB có hỗ trợ transaction không
    if (db && typeof db.promise === "function" && typeof db.promise().getConnection === "function") {
      
      // === LOGIC GIAO DỊCH (TRANSACTIONAL) ===
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      // === SỬA LOGIC SINH ID ===
      // Chuyển 'X0028' thành 28, tìm max, rồi + 1
      const [lastCar] = await connection.query("SELECT MAX(CAST(SUBSTRING(XE_MAXE, 2) AS UNSIGNED)) as maxIdNum FROM XE");
      const nextIdNum = (lastCar[0].maxIdNum || 0) + 1;
      newXeMaXe = 'X' + String(nextIdNum).padStart(4, '0');
      // === KẾT THÚC SỬA ===
      
      // 5. Tạo đường dẫn
      relativeDbPath = path.join('uploads', hangXe, parentFolder, modelTen, newXeMaXe).replace(/\\/g, '/');
      targetDir = path.join(__dirname, relativeDbPath); 
      await fs.mkdir(targetDir, { recursive: true });

      for (const file of files) {
        await fs.rename(file.path, path.join(targetDir, file.originalname));
      }

      // 6. INSERT vào XE
      await connection.query(
        "INSERT INTO XE (XE_MAXE, MODEL_MAMODEL, XE_BIENSOXE) VALUES (?, ?, ?)",
        [newXeMaXe, modelId, bienSo]
      );

      // 7. INSERT vào TIEN_ICH_XE
      const f = JSON.parse(features || "{}");
      await connection.query(
        `INSERT INTO TIEN_ICH_XE (XE_MAXE, TIX_NGAYGIOCAPNHAT, TIX_NGAYGIODANGKIEM, TIX_BANDO, TIX_BLUETOOTH, TIX_CAMERAHANHTRINH, TIX_CAMERALUI, TIX_CAMBIENVACHAM, TIX_CANHBAOTOCDO, TIX_DINHVIGPS, TIX_KHECAMUSB, TIX_LOPDUPHONG, TIX_MANHINHDVD, TIX_ETC, TIX_TUIKHIANTOAN, TIX_LINKHINH)
         VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newXeMaXe, !!f.TIX_BANDO, !!f.TIX_BLUETOOTH, !!f.TIX_CAMERAHANHTRINH, !!f.TIX_CAMERALUI,
          !!f.TIX_CAMBIENVACHAM, !!f.TIX_CANHBAOTOCDO, !!f.TIX_DINHVIGPS, !!f.TIX_KHECAMUSB,
          !!f.TIX_LOPDUPHONG, !!f.TIX_MANHINHDVD, !!f.TIX_ETC, !!f.TIX_TUIKHIANTOAN,
          relativeDbPath
        ]
      );

      // 8. INSERT vào BANG_GIA
      await connection.query(
        "INSERT INTO BANG_GIA (XE_MAXE, CX_MACX, BG_NGAYGIOAPDUNG, BG_GIATHUETHEONGAY, BG_NGAYGIONGUNGAPDUNG) VALUES (?, ?, NOW(), ?, NULL)",
        [newXeMaXe, ownerId, giaThue]
      );

      // 9. INSERT vào BAN_GHI_TINH_TRANG (Sẵn sàng)
      const MA_TINH_TRANG_SAN_SANG = 1;
      await connection.query(
        "INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC) VALUES (?, ?, ?, NOW(), NULL)",
        [newXeMaXe, MA_TINH_TRANG_SAN_SANG, chiNhanhId]
      );
      
      await connection.commit();

    } else {
      
      // === LOGIC DỰ PHÒNG (FALLBACK / NON-TRANSACTIONAL) ===
      console.warn("Đang thêm xe (non-transactional) vì db connection không hỗ trợ promise().");

      // === SỬA LOGIC SINH ID ===
      // Chuyển 'X0028' thành 28, tìm max, rồi + 1
      const lastCar = await queryAsync("SELECT MAX(CAST(SUBSTRING(XE_MAXE, 2) AS UNSIGNED)) as maxIdNum FROM XE");
      const nextIdNum = (lastCar[0].maxIdNum || 0) + 1;
      newXeMaXe = 'X' + String(nextIdNum).padStart(4, '0');
      // === KẾT THÚC SỬA ===

      // 5. Tạo đường dẫn và di chuyển file
      relativeDbPath = path.join('uploads', hangXe, parentFolder, modelTen, newXeMaXe).replace(/\\/g, '/');
      targetDir = path.join(__dirname, relativeDbPath); 
      await fs.mkdir(targetDir, { recursive: true });

      for (const file of files) {
        await fs.rename(file.path, path.join(targetDir, file.originalname));
      }
      
      // 6. INSERT vào XE
      await queryAsync(
        "INSERT INTO XE (XE_MAXE, MODEL_MAMODEL, XE_BIENSOXE) VALUES (?, ?, ?)",
        [newXeMaXe, modelId, bienSo]
      );

      // 7. INSERT vào TIEN_ICH_XE
      const f = JSON.parse(features || "{}");
      await queryAsync(
        `INSERT INTO TIEN_ICH_XE (XE_MAXE, TIX_NGAYGIOCAPNHAT, TIX_NGAYGIODANGKIEM, TIX_BANDO, TIX_BLUETOOTH, TIX_CAMERAHANHTRINH, TIX_CAMERALUI, TIX_CAMBIENVACHAM, TIX_CANHBAOTOCDO, TIX_DINHVIGPS, TIX_KHECAMUSB, TIX_LOPDUPHONG, TIX_MANHINHDVD, TIX_ETC, TIX_TUIKHIANTOAN, TIX_LINKHINH)
         VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newXeMaXe, !!f.TIX_BANDO, !!f.TIX_BLUETOOTH, !!f.TIX_CAMERAHANHTRINH, !!f.TIX_CAMERALUI,
          !!f.TIX_CAMBIENVACHAM, !!f.TIX_CANHBAOTOCDO, !!f.TIX_DINHVIGPS, !!f.TIX_KHECAMUSB,
          !!f.TIX_LOPDUPHONG, !!f.TIX_MANHINHDVD, !!f.TIX_ETC, !!f.TIX_TUIKHIANTOAN,
          relativeDbPath
        ]
      );

      // 8. INSERT vào BANG_GIA
      await queryAsync(
        "INSERT INTO BANG_GIA (XE_MAXE, CX_MACX, BG_NGAYGIOAPDUNG, BG_GIATHUETHEONGAY, BG_NGAYGIONGUNGAPDUNG) VALUES (?, ?, NOW(), ?, NULL)",
        [newXeMaXe, ownerId, giaThue]
      );

      // 9. INSERT vào BAN_GHI_TINH_TRANG (Sẵn sàng)
      const MA_TINH_TRANG_SAN_SANG = 1;
      await queryAsync(
        "INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC) VALUES (?, ?, ?, NOW(), NULL)",
        [newXeMaXe, MA_TINH_TRANG_SAN_SANG, chiNhanhId]
      );
    }
    
    // Nếu đến được đây là thành công
    res.json({ ok: true, message: "Thêm xe mới thành công.", newCarId: newXeMaXe });

  } catch (err) {
    // Xử lý lỗi
    if (connection) await connection.rollback(); // Rollback nếu có transaction
    
    // Dù lỗi ở đâu, cũng cố gắng xóa các file tạm đã tải lên (nếu chưa bị xóa)
    await cleanupFiles();
    
    // (Nâng cao) Cố gắng xóa cả thư mục đã tạo nếu có lỗi
    if (targetDir) {
      try { await fs.rmdir(targetDir); } catch(e) {}
    }

    console.error("Lỗi POST /owner/:ownerId/cars:", err);
    res.status(500).json({ error: err.message || "Không thể thêm xe mới." });
  } finally {
    if (connection) connection.release();
  }
});

/* Cập nhật trạng thái xe  */
app.post("/owner/update-car-status", async (req, res) => {
  const { xeId, newStatusId, newBranchId } = req.body;
  if (!xeId || !newStatusId || !newBranchId) {
    return res.status(400).json({ error: "Thiếu thông tin Xe, Trạng thái hoặc Chi nhánh." });
  }

  const MA_TINH_TRANG_SAN_SANG = 1;
  const MA_TINH_TRANG_DANG_THUE = 2;
  const MA_TINH_TRANG_BAO_DUONG = 3;
  const newStatusIdNum = Number(newStatusId);

  let connection;
  try {
    if (db && typeof db.promise === "function" && typeof db.promise().getConnection === "function") {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      const [currentStatusRows] = await connection.query(
        `SELECT * FROM BAN_GHI_TINH_TRANG 
         WHERE XE_MAXE = ? 
           AND (BGTT_NGAYGIOBATDAU IS NULL OR BGTT_NGAYGIOBATDAU <= NOW())
           AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > NOW())
         LIMIT 1`,
        [xeId]
      );
      
      if (currentStatusRows.length === 0) throw new Error("Không tìm thấy trạng thái hiện tại.");
      const currentStatus = currentStatusRows[0];
      const currentStatusId = Number(currentStatus.TTX_MATTX);

      if (currentStatusId === MA_TINH_TRANG_DANG_THUE) {
        if (newStatusIdNum === MA_TINH_TRANG_SAN_SANG || newStatusIdNum === MA_TINH_TRANG_BAO_DUONG) {
          throw new Error("Không thể đổi trạng thái. Xe này hiện đang được khách thuê (đang chạy).");
        }
      }

      // C. Thực hiện Update
      if (currentStatusId !== newStatusIdNum || currentStatus.CNTX_MACNTX !== newBranchId) {
        await connection.query(
          `UPDATE BAN_GHI_TINH_TRANG SET BGTT_NGAYGIOKETTHUC = NOW() 
           WHERE XE_MAXE = ? AND TTX_MATTX = ? AND CNTX_MACNTX = ? AND BGTT_NGAYGIOBATDAU = ?`,
          [xeId, currentStatus.TTX_MATTX, currentStatus.CNTX_MACNTX, currentStatus.BGTT_NGAYGIOBATDAU]
        );

        await connection.query(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC) 
           VALUES (?, ?, ?, NOW(), NULL)`,
          [xeId, newStatusId, newBranchId]
        );
      }
      
      await connection.commit();

    } else {
      // 2. Chạy chế độ thường (Fallback) nếu không có Transaction
      console.warn("Đang cập nhật trạng thái (non-transactional)...");

      // A. Lấy trạng thái hiện tại
      const currentStatusRows = await queryAsync(
        `SELECT * FROM BAN_GHI_TINH_TRANG 
         WHERE XE_MAXE = ? 
           AND (BGTT_NGAYGIOBATDAU IS NULL OR BGTT_NGAYGIOBATDAU <= NOW())
           AND (BGTT_NGAYGIOKETTHUC IS NULL OR BGTT_NGAYGIOKETTHUC > NOW())
         LIMIT 1`,
        [xeId]
      );
      
      if (currentStatusRows.length === 0) throw new Error("Không tìm thấy trạng thái hiện tại.");
      const currentStatus = currentStatusRows[0];
      const currentStatusId = Number(currentStatus.TTX_MATTX);

      // B. Kiểm tra nghiệp vụ
      if (currentStatusId === MA_TINH_TRANG_DANG_THUE) {
        if (newStatusIdNum === MA_TINH_TRANG_SAN_SANG || newStatusIdNum === MA_TINH_TRANG_BAO_DUONG) {
          throw new Error("Không thể đổi trạng thái. Xe này hiện đang được khách thuê (đang chạy).");
        }
      }

      // C. Thực hiện Update
      if (currentStatusId !== newStatusIdNum || currentStatus.CNTX_MACNTX !== newBranchId) {
        await queryAsync(
          `UPDATE BAN_GHI_TINH_TRANG SET BGTT_NGAYGIOKETTHUC = NOW() 
           WHERE XE_MAXE = ? AND TTX_MATTX = ? AND CNTX_MACNTX = ? AND BGTT_NGAYGIOBATDAU = ?`,
          [xeId, currentStatus.TTX_MATTX, currentStatus.CNTX_MACNTX, currentStatus.BGTT_NGAYGIOBATDAU]
        );

        await queryAsync(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC) 
           VALUES (?, ?, ?, NOW(), NULL)`,
          [xeId, newStatusId, newBranchId]
        );
      }
    }
    
    res.json({ ok: true, message: "Cập nhật trạng thái xe thành công." });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Lỗi /owner/update-car-status:", err);
    res.status(400).json({ error: err.message || "Không thể cập nhật trạng thái xe." });
  } finally {
    if (connection) connection.release();
  }
});

/* Kiểm tra xe có hợp đồng trong tương lai không */
app.get("/owner/cars/:xeId/future-bookings", async (req, res) => {
  const { xeId } = req.params;
  try {
    // SỬA: Đổi tên biến thành 'rows' và bỏ dấu [] để lấy nguyên mảng
    const rows = await queryAsync(
      `SELECT HDT_MAHDT FROM HOP_DONG_THUE 
       WHERE XE_MAXE = ? AND HDT_NGAYGIOBDTHUE > NOW()
       LIMIT 1`,
       [xeId]
    );
    
    // SỬA: Kiểm tra độ dài của mảng rows
    res.json({ hasBookings: rows && rows.length > 0 });

  } catch (err) {
    console.error(`Lỗi /future-bookings ${xeId}:`, err);
    res.status(500).json({ error: err.message || "Không thể kiểm tra hợp đồng." });
  }
});

/* Cập nhật chi tiết xe  */
app.post("/owner/update-car-details/:ownerId/:xeId", async (req, res) => {
  const { ownerId, xeId } = req.params;
  // SỬA: Xóa 'linkHinh' khỏi đây. Nó không được gửi từ form này.
  const { giaThue, features } = req.body; 
  
  let connection;
  try {
    if (db && typeof db.promise === "function" && typeof db.promise().getConnection === "function") {
      // === LOGIC GIAO DỊCH (TRANSACTIONAL) ===
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      if (giaThue) {
          await connection.query(
            `UPDATE BANG_GIA SET BG_NGAYGIONGUNGAPDUNG = NOW() 
             WHERE XE_MAXE = ? AND CX_MACX = ? AND BG_NGAYGIONGUNGAPDUNG IS NULL`,
             [xeId, ownerId]
          );
          await connection.query(
            `INSERT INTO BANG_GIA (XE_MAXE, CX_MACX, BG_NGAYGIOAPDUNG, BG_GIATHUETHEONGAY, BG_NGAYGIONGUNGAPDUNG) 
             VALUES (?, ?, NOW(), ?, NULL)`,
             [xeId, ownerId, giaThue]
          );
      }
      const f = features || {};
      
      // SỬA: Xóa TIX_LINKHINH khỏi câu query
      await connection.query(
        `INSERT INTO TIEN_ICH_XE 
         (XE_MAXE, TIX_NGAYGIOCAPNHAT, TIX_NGAYGIODANGKIEM, TIX_BANDO, TIX_BLUETOOTH, TIX_CAMERAHANHTRINH, TIX_CAMERALUI, TIX_CAMBIENVACHAM, TIX_CANHBAOTOCDO, TIX_DINHVIGPS, TIX_KHECAMUSB, TIX_LOPDUPHONG, TIX_MANHINHDVD, TIX_ETC, TIX_TUIKHIANTOAN)
         VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         TIX_NGAYGIOCAPNHAT = NOW(),
         TIX_BANDO = VALUES(TIX_BANDO), TIX_BLUETOOTH = VALUES(TIX_BLUETOOTH),
         TIX_CAMERAHANHTRINH = VALUES(TIX_CAMERAHANHTRINH), TIX_CAMERALUI = VALUES(TIX_CAMERALUI),
         TIX_CAMBIENVACHAM = VALUES(TIX_CAMBIENVACHAM), TIX_CANHBAOTOCDO = VALUES(TIX_CANHBAOTOCDO),
         TIX_DINHVIGPS = VALUES(TIX_DINHVIGPS), TIX_KHECAMUSB = VALUES(TIX_KHECAMUSB),
         TIX_LOPDUPHONG = VALUES(TIX_LOPDUPHONG), TIX_MANHINHDVD = VALUES(TIX_MANHINHDVD),
         TIX_ETC = VALUES(TIX_ETC), TIX_TUIKHIANTOAN = VALUES(TIX_TUIKHIANTOAN)
         `,
         // SỬA: Xóa 'linkHinh || null' khỏi mảng tham số
        [
          xeId,
          !!f.TIX_BANDO, !!f.TIX_BLUETOOTH, !!f.TIX_CAMERAHANHTRINH, !!f.TIX_CAMERALUI,
          !!f.TIX_CAMBIENVACHAM, !!f.TIX_CANHBAOTOCDO, !!f.TIX_DINHVIGPS, !!f.TIX_KHECAMUSB,
          !!f.TIX_LOPDUPHONG, !!f.TIX_MANHINHDVD, !!f.TIX_ETC, !!f.TIX_TUIKHIANTOAN
        ]
      );
      
      await connection.commit();
      
    } else {
      // === LOGIC DỰ PHÒNG (FALLBACK / NON-TRANSACTIONAL) ===
      console.warn("Đang cập nhật chi tiết xe (non-transactional)...");
      
      if (giaThue) {
          await queryAsync(
            `UPDATE BANG_GIA SET BG_NGAYGIONGUNGAPDUNG = NOW() 
             WHERE XE_MAXE = ? AND CX_MACX = ? AND BG_NGAYGIONGUNGAPDUNG IS NULL`,
             [xeId, ownerId]
          );
          await queryAsync(
            `INSERT INTO BANG_GIA (XE_MAXE, CX_MACX, BG_NGAYGIOAPDUNG, BG_GIATHUETHEONGAY, BG_NGAYGIONGUNGAPDUNG) 
             VALUES (?, ?, NOW(), ?, NULL)`,
             [xeId, ownerId, giaThue]
          );
      }
      const f = features || {};
      
      // SỬA: Xóa TIX_LINKHINH khỏi câu query
      await queryAsync(
        `INSERT INTO TIEN_ICH_XE 
         (XE_MAXE, TIX_NGAYGIOCAPNHAT, TIX_NGAYGIODANGKIEM, TIX_BANDO, TIX_BLUETOOTH, TIX_CAMERAHANHTRINH, TIX_CAMERALUI, TIX_CAMBIENVACHAM, TIX_CANHBAOTOCDO, TIX_DINHVIGPS, TIX_KHECAMUSB, TIX_LOPDUPHONG, TIX_MANHINHDVD, TIX_ETC, TIX_TUIKHIANTOAN)
         VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         TIX_NGAYGIOCAPNHAT = NOW(),
         TIX_BANDO = VALUES(TIX_BANDO), TIX_BLUETOOTH = VALUES(TIX_BLUETOOTH),
         TIX_CAMERAHANHTRINH = VALUES(TIX_CAMERAHANHTRINH), TIX_CAMERALUI = VALUES(TIX_CAMERALUI),
         TIX_CAMBIENVACHAM = VALUES(TIX_CAMBIENVACHAM), TIX_CANHBAOTOCDO = VALUES(TIX_CANHBAOTOCDO),
         TIX_DINHVIGPS = VALUES(TIX_DINHVIGPS), TIX_KHECAMUSB = VALUES(TIX_KHECAMUSB),
         TIX_LOPDUPHONG = VALUES(TIX_LOPDUPHONG), TIX_MANHINHDVD = VALUES(TIX_MANHINHDVD),
         TIX_ETC = VALUES(TIX_ETC), TIX_TUIKHIANTOAN = VALUES(TIX_TUIKHIANTOAN)
         `,
         // SỬA: Xóa 'linkHinh || null' khỏi mảng tham số
        [
          xeId,
          !!f.TIX_BANDO, !!f.TIX_BLUETOOTH, !!f.TIX_CAMERAHANHTRINH, !!f.TIX_CAMERALUI,
          !!f.TIX_CAMBIENVACHAM, !!f.TIX_CANHBAOTOCDO, !!f.TIX_DINHVIGPS, !!f.TIX_KHECAMUSB,
          !!f.TIX_LOPDUPHONG, !!f.TIX_MANHINHDVD, !!f.TIX_ETC, !!f.TIX_TUIKHIANTOAN
        ]
      );
    }
    
    // Gửi phản hồi thành công (cho cả 2 trường hợp)
    res.json({ ok: true, message: "Cập nhật chi tiết xe thành công." });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Lỗi /owner/update-car-details:", err);
    res.status(500).json({ error: "Không thể cập nhật chi tiết xe." });
  } finally {
    if (connection) connection.release();
  }
});

/* Tải ảnh lên */
app.post("/owner/cars/:xeId/images", upload.array('images', 10), async (req, res) => {
  const { xeId } = req.params;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Không có file nào được chọn." });
  }
  
  try {
    // === SỬA Ở ĐÂY ===
    // 1. Đổi tên biến (không dùng destructuring)
    const carInfoRows = await queryAsync(
      `SELECT M.MODEL_TENMODEL, H.HX_TENHANGXE, TIX.TIX_LINKHINH
       FROM XE X
       JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
       JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
       LEFT JOIN TIEN_ICH_XE TIX ON X.XE_MAXE = TIX.XE_MAXE
       WHERE X.XE_MAXE = ?`,
      [xeId]
    );
    // 2. Sửa lại cách kiểm tra
    if (!carInfoRows || carInfoRows.length === 0) {
      throw new Error("Không tìm thấy xe.");
    }
    // 3. Lấy object carInfo từ mảng
    const carInfo = carInfoRows[0]; 
    // === KẾT THÚC SỬA ===
    
    // 2. Xác định đường dẫn
    let relativeDbPath = carInfo.TIX_LINKHINH; // Sửa: carInfo.TIX_LINKHINH
    
    if (!relativeDbPath) {
      const hangXe = carInfo.HX_TENHANGXE; // Sửa: carInfo.HX_TENHANGXE
      const modelTen = carInfo.MODEL_TENMODEL; // Sửa: carInfo.MODEL_TENMODEL
      const modelParts = modelTen.split(' ');
      const parentFolder = modelParts[0] || modelTen;
      relativeDbPath = path.join('uploads', hangXe, parentFolder, modelTen, xeId).replace(/\\/g, '/');
      await queryAsync(
        "UPDATE TIEN_ICH_XE SET TIX_LINKHINH = ? WHERE XE_MAXE = ?",
        [relativeDbPath, xeId]
      );
    }
    
    const targetDir = path.join(__dirname, relativeDbPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    // 3. Di chuyển file
    for (const file of files) {
      const oldPath = file.path;
      const newPath = path.join(targetDir, file.originalname);
      await fs.rename(oldPath, newPath);
    }
    
    res.json({ ok: true, message: `Đã tải lên ${files.length} ảnh.` });

  } catch (err) {
    for (const file of files) {
      try { await fs.unlink(file.path); } catch (e) {}
    }
    console.error(`Lỗi POST /owner/cars/${xeId}/images:`, err);
    res.status(500).json({ error: err.message || "Không thể tải lên hình ảnh." });
  }
});

/* Xóa ảnh  */
app.delete("/owner/cars/image", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "Thiếu đường dẫn ảnh." });
  }
  try {
    const fullPath = path.join(__dirname, imageUrl);
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fullPath.startsWith(uploadsDir)) {
      await fs.unlink(fullPath); // Dùng fs.promises
      res.json({ ok: true, message: "Đã xóa ảnh." });
    } else {
      res.status(403).json({ error: "Không được phép xóa file này." });
    }
  } catch (err) {
    console.error("Lỗi DELETE /owner/cars/image:", err);
    res.status(500).json({ error: err.message || "Không thể xóa ảnh." });
  }
});

/*  SỬA CHỮA LINK ẢNH BỊ MẤT  */
app.post("/owner/cars/:xeId/relink-images", async (req, res) => {
  const { xeId } = req.params;

  try {
    // === SỬA Ở ĐÂY ===
    // 1. Đổi tên biến (không dùng destructuring)
    const carInfoRows = await queryAsync(
      `SELECT M.MODEL_TENMODEL, H.HX_TENHANGXE
       FROM XE X
       JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
       JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
       WHERE X.XE_MAXE = ?`,
      [xeId]
    );

    // 2. Sửa lại cách kiểm tra
    if (!carInfoRows || carInfoRows.length === 0) {
      throw new Error("Không tìm thấy thông tin xe.");
    }
    // 3. Lấy object carInfo từ mảng
    const carInfo = carInfoRows[0];
    // === KẾT THÚC SỬA ===

    // 2. Tái tạo đường dẫn
    const hangXe = carInfo.HX_TENHANGXE; // Sửa: carInfo.HX_TENHANGXE
    const modelTen = carInfo.MODEL_TENMODEL; // Sửa: carInfo.MODEL_TENMODEL
    const modelParts = modelTen.split(' ');
    const parentFolder = modelParts[0] || modelTen;
    const relativeDbPath = path.join('uploads', hangXe, parentFolder, modelTen, xeId).replace(/\\/g, '/');
    
    // 3. Kiểm tra xem thư mục vật lý có tồn tại không
    const targetDir = path.join(__dirname, relativeDbPath);
    await fs.access(targetDir); // Sẽ báo lỗi nếu không tìm thấy
    
    // 4. Cập nhật lại CSDL
    await queryAsync(
      "UPDATE TIEN_ICH_XE SET TIX_LINKHINH = ? WHERE XE_MAXE = ?",
      [relativeDbPath, xeId]
    );
    
    res.json({ ok: true, message: `Đã khôi phục liên kết ảnh cho ${xeId}.` });

  } catch (err) {
    console.error(`Lỗi /relink-images ${xeId}:`, err);
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: "Không tìm thấy thư mục ảnh gốc trên server." });
    }
    res.status(500).json({ error: err.message || "Không thể khôi phục liên kết." });
  }
});

/*  LẤY DANH SÁCH HỢP ĐỒNG CỦA CHỦ XE */
app.get("/owner/:ownerId/contracts", async (req, res) => {
  const { ownerId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  try {
    const countSql = "SELECT COUNT(HDT_MAHDT) AS total FROM HOP_DONG_THUE WHERE CX_MACX = ?";
    const countRows = await queryAsync(countSql, [ownerId]);
    const total = countRows[0]?.total || 0;

    const sql = `
      SELECT 
        H.HDT_MAHDT, 
        H.HDT_NGAYGIOLAPHOPDONG,
        H.HDT_NGAYGIOBDTHUE,
        H.HDT_NGAYGIOKTTHUE,
        H.HDT_CHITIETHD,
        H.XE_MAXE,
        H.CX_MACX,

        COALESCE(K.KH_TENND, 'N/A') AS KH_TENND,
        COALESCE(K.KH_SODIENTHOAI, 'N/A') AS KH_SODIENTHOAI,
        COALESCE(K.KH_EMAIL, 'N/A') AS KH_EMAIL,
        COALESCE(K.KH_SOCCCD, 'N/A') AS KH_SOCCCD,
        COALESCE(K.KH_SOGPLX, 'N/A') AS KH_SOGPLX,

        COALESCE(X.XE_BIENSOXE, 'N/A') AS XE_BIENSOXE,
        M.MODEL_TENMODEL AS TenModel,
        HX.HX_TENHANGXE AS HangXe,
        (SELECT TIX_LINKHINH FROM TIEN_ICH_XE t WHERE t.XE_MAXE = H.XE_MAXE LIMIT 1) AS FolderAnh,

        -- Lấy GIÁ THUÊ
        COALESCE(
          (SELECT BG_GIATHUETHEONGAY FROM BANG_GIA 
           WHERE XE_MAXE = H.XE_MAXE AND BG_NGAYGIOAPDUNG <= H.HDT_NGAYGIOLAPHOPDONG 
           ORDER BY BG_NGAYGIOAPDUNG DESC LIMIT 1),
          (SELECT BG_GIATHUETHEONGAY FROM BANG_GIA 
           WHERE XE_MAXE = H.XE_MAXE 
           ORDER BY BG_NGAYGIOAPDUNG DESC LIMIT 1),
          0
        ) AS GiaThueNgay,

        -- Tính SỐ NGÀY (+1)
        GREATEST(TIMESTAMPDIFF(DAY, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE) + 1, 1) AS Days

      FROM HOP_DONG_THUE H
      LEFT JOIN KHACH_HANG K ON H.KH_SOCCCD = K.KH_SOCCCD AND H.KH_SOGPLX = K.KH_SOGPLX
      LEFT JOIN XE X ON H.XE_MAXE = X.XE_MAXE
      LEFT JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      LEFT JOIN HANG_XE HX ON M.HX_MAHANGXE = HX.HX_MAHANGXE
      
      WHERE H.CX_MACX = ?
      
      -- Group By đầy đủ
      GROUP BY 
        H.HDT_MAHDT, H.HDT_NGAYGIOLAPHOPDONG, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE, 
        H.HDT_CHITIETHD, H.XE_MAXE, H.CX_MACX,
        K.KH_TENND, K.KH_SODIENTHOAI, K.KH_EMAIL, K.KH_SOCCCD, K.KH_SOGPLX,
        X.XE_BIENSOXE, M.MODEL_TENMODEL, HX.HX_TENHANGXE
        
      ORDER BY H.HDT_NGAYGIOLAPHOPDONG DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await queryAsync(sql, [ownerId, pageSize, offset]);

    // Xử lý bổ sung (Ảnh, Tổng tiền, Điều khoản, Thông tin chủ xe)
    // Cần lấy thông tin chủ xe để hiển thị trong chi tiết hợp đồng
    const ownerInfo = await queryAsync("SELECT * FROM CHU_XE WHERE CX_MACX = ?", [ownerId]);
    const currentOwner = ownerInfo[0] || {};

    const mapped = await Promise.all((rows || []).map(async (item) => {
      const hinhAnh = await getFirstImage(item.FolderAnh);
      const totalMoney = (item.GiaThueNgay || 0) * (item.Days || 0);

      // Lấy điều khoản
      const terms = await queryAsync(
        `SELECT DKSDDV_NOIDUNG as NoiDung 
         FROM DIEU_KHOAN_SU_DUNG_DV 
         WHERE (CX_MACX IS NULL OR CX_MACX = ?)`, 
        [ownerId]
      );

      return { 
        ...item,
        // Map các trường cho khớp với ContractView
        TongTien: totalMoney, // Cho danh sách
        Total: totalMoney,    // Cho chi tiết
        HinhAnh: hinhAnh,
        DieuKhoan: terms,
        // Thông tin chủ xe (để hiển thị trong contract view)
        CX_HOTENCX: currentOwner.CX_HOTENCX,
        CX_SODT: currentOwner.CX_SODT,
        CX_EMAIL: currentOwner.CX_EMAIL,
        CX_STK: currentOwner.CX_STK,
        CX_NGANHANG: currentOwner.CX_NGANHANG
      };
    }));

    res.json({ items: mapped, total });
  
  } catch (err) {
    console.error("Lỗi /owner/:ownerId/contracts:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách hợp đồng." });
  }
});

/*  LẤY DANH SÁCH ĐIỀU KHOẢN CỦA CHỦ XE   */
app.get("/owner/:ownerId/terms", async (req, res) => {
  const { ownerId } = req.params;
  try {
    const sql = `
      SELECT * FROM DIEU_KHOAN_SU_DUNG_DV
      WHERE CX_MACX = ? OR CX_MACX IS NULL -- Lấy cả điều khoản chung (IS NULL) và riêng
      ORDER BY DKSDDV_NGAYGIONGUNGAPDUNG ASC, DKSDDV_NGAYGIOAPDUNG DESC
    `;
    const terms = await queryAsync(sql, [ownerId]);
    res.json(terms);
  } catch (err) {
    console.error("Lỗi /owner/:ownerId/terms:", err);
    res.status(500).json({ error: "Lỗi khi tải điều khoản." });
  }
});

/*  THÊM ĐIỀU KHOẢN MỚI */
app.post("/owner/:ownerId/terms", async (req, res) => {
  const { ownerId } = req.params;
  const { noiDung } = req.body;
  if (!noiDung) return res.status(400).json({ error: "Nội dung không được để trống." });

  try {
    // Lấy ID mới (an toàn)
    const [lastTerm] = await queryAsync("SELECT MAX(DKSDDV_MADKSDDV) as maxId FROM DIEU_KHOAN_SU_DUNG_DV");
    const nextId = (lastTerm.maxId || 0) + 1;

    await queryAsync(
      `INSERT INTO DIEU_KHOAN_SU_DUNG_DV 
       (DKSDDV_MADKSDDV, CX_MACX, DKSDDV_NOIDUNG, DKSDDV_NGAYGIOAPDUNG, DKSDDV_NGAYGIONGUNGAPDUNG)
       VALUES (?, ?, ?, NOW(), NULL)`,
      [nextId, ownerId, noiDung]
    );
    res.json({ ok: true, message: "Thêm điều khoản thành công." });
  } catch (err) {
    console.error("Lỗi POST /owner/:ownerId/terms:", err);
    res.status(500).json({ error: "Lỗi khi thêm điều khoản." });
  }
});

/*  HỦY (DEACTIVATE) ĐIỀU KHOẢN */
app.put("/owner/:ownerId/terms/:termId/deactivate", async (req, res) => {
  const { ownerId, termId } = req.params;
  try {
    // Chỉ cho phép chủ xe hủy điều khoản của chính họ
    const result = await queryAsync(
      `UPDATE DIEU_KHOAN_SU_DUNG_DV 
       SET DKSDDV_NGAYGIONGUNGAPDUNG = NOW() 
       WHERE DKSDDV_MADKSDDV = ? AND CX_MACX = ? AND DKSDDV_NGAYGIONGUNGAPDUNG IS NULL`,
      [termId, ownerId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy điều khoản, hoặc điều khoản này không thuộc sở hữu của bạn (có thể là điều khoản chung)." });
    }
    res.json({ ok: true, message: "Hủy điều khoản thành công." });
  } catch (err) {
    console.error("Lỗi PUT /terms/deactivate:", err);
    res.status(500).json({ error: "Lỗi khi hủy điều khoản." });
  }
});

/*  LẤY DANH SÁCH XE (NGẮN GỌN) CHO DROPDOWN */
app.get("/owner/:ownerId/cars-list", async (req, res) => {
  const { ownerId } = req.params;
  try {
    const sql = `
      SELECT 
        X.XE_MAXE, 
        X.XE_BIENSOXE, 
        M.MODEL_TENMODEL,
        H.HX_TENHANGXE
      FROM XE X
      JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
      WHERE EXISTS (
        SELECT 1 FROM BANG_GIA bg 
        WHERE bg.XE_MAXE = X.XE_MAXE AND bg.CX_MACX = ?
      )
      GROUP BY X.XE_MAXE, X.XE_BIENSOXE, M.MODEL_TENMODEL, H.HX_TENHANGXE
      ORDER BY H.HX_TENHANGXE, M.MODEL_TENMODEL
    `;
    const cars = await queryAsync(sql, [ownerId]);
    res.json(cars);
  } catch (err) {
    console.error("Lỗi /owner/:ownerId/cars-list:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách xe." });
  }
});

/*  LẤY TOÀN BỘ LỊCH SỬ TÌNH TRẠNG CỦA 1 XE */
app.get("/owner/car-schedule/:xeId", async (req, res) => {
  const { xeId } = req.params;
  try {
    const sql = `
      SELECT 
        BGTT.TTX_MATTX,
        TTX.TTX_TENTINHTRANG,
        BGTT.BGTT_NGAYGIOBATDAU,
        BGTT.BGTT_NGAYGIOKETTHUC
      FROM BAN_GHI_TINH_TRANG BGTT
      JOIN TINH_TRANG_XE TTX ON BGTT.TTX_MATTX = TTX.TTX_MATTX
      WHERE BGTT.XE_MAXE = ?
      ORDER BY BGTT.BGTT_NGAYGIOBATDAU ASC
    `;
    const schedule = await queryAsync(sql, [xeId]);
    res.json(schedule);
  } catch (err) {
    console.error("Lỗi /owner/car-schedule/:xeId:", err);
    res.status(500).json({ error: "Lỗi khi tải lịch trình xe." });
  }
});

/* Thống kê */
app.get("/owner/stats/:cx", async (req, res) => {
  const { cx } = req.params;
  const { year } = req.query;
  try {
    const tongQuan = await queryAsync(
      `
      SELECT
        COALESCE(SUM(
          (SELECT COALESCE(b.BG_GIATHUETHEONGAY,0)
           FROM BANG_GIA b
           WHERE b.XE_MAXE = H.XE_MAXE AND b.CX_MACX = H.CX_MACX
             AND b.BG_NGAYGIOAPDUNG <= H.HDT_NGAYGIOLAPHOPDONG
           ORDER BY b.BG_NGAYGIOAPDUNG DESC
           LIMIT 1
          ) * GREATEST(TIMESTAMPDIFF(DAY, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE) + 1, 1) -- ĐÃ SỬA (+ 1)
        ), 0) AS tongDoanhThu,
        COUNT(H.HDT_MAHDT) AS tongLuot,
        COUNT(DISTINCT H.XE_MAXE) AS tongXe
      FROM HOP_DONG_THUE H
      WHERE H.CX_MACX = ?
      `,
      [cx]
    );
    let luotThueThang = [];
    if (year) {
      luotThueThang = await queryAsync(
        `
        SELECT MONTH(H.HDT_NGAYGIOLAPHOPDONG) AS thang,
               COUNT(H.HDT_MAHDT) AS soLuot
        FROM HOP_DONG_THUE H
        WHERE H.CX_MACX = ? AND YEAR(H.HDT_NGAYGIOLAPHOPDONG) = ?
        GROUP BY thang
        ORDER BY thang
        `,
        [cx, year]
      );
    }
    let topXeLuot = [];
    if (year) {
      topXeLuot = await queryAsync(
        `
        SELECT X.XE_BIENSOXE AS BienSo, HX.HX_TENHANGXE AS HangXe, M.MODEL_TENMODEL AS Model,
               COUNT(H.HDT_MAHDT) AS SoLanThue
        FROM HOP_DONG_THUE H
        JOIN XE X ON H.XE_MAXE = X.XE_MAXE
        LEFT JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
        LEFT JOIN HANG_XE HX ON M.HX_MAHANGXE = HX.HX_MAHANGXE
        WHERE H.CX_MACX = ? AND YEAR(H.HDT_NGAYGIOLAPHOPDONG) = ?
        GROUP BY X.XE_MAXE, X.XE_BIENSOXE, HX.HX_TENHANGXE, M.MODEL_TENMODEL
        ORDER BY SoLanThue DESC
        LIMIT 5
        `,
        [cx, year]
      );
    }
    let topXeDoanhThu = [];
    if (year) {
      topXeDoanhThu = await queryAsync(
        `
        SELECT X.XE_BIENSOXE AS BienSo, HX.HX_TENHANGXE AS HangXe, M.MODEL_TENMODEL AS Model,
               COALESCE(SUM(
                 (SELECT COALESCE(b.BG_GIATHUETHEONGAY,0)
                  FROM BANG_GIA b
                  WHERE b.XE_MAXE = H.XE_MAXE AND b.CX_MACX = H.CX_MACX
                    AND b.BG_NGAYGIOAPDUNG <= H.HDT_NGAYGIOLAPHOPDONG
                  ORDER BY b.BG_NGAYGIOAPDUNG DESC
                  LIMIT 1
                 ) * GREATEST(TIMESTAMPDIFF(DAY, H.HDT_NGAYGIOBDTHUE, H.HDT_NGAYGIOKTTHUE) + 1, 1) -- ĐÃ SỬA (+ 1)
               ), 0) AS TongDoanhThu
        FROM HOP_DONG_THUE H
        JOIN XE X ON H.XE_MAXE = X.XE_MAXE
        LEFT JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
        LEFT JOIN HANG_XE HX ON M.HX_MAHANGXE = HX.HX_MAHANGXE
        WHERE H.CX_MACX = ? AND YEAR(H.HDT_NGAYGIOLAPHOPDONG) = ?
        GROUP BY X.XE_MAXE, X.XE_BIENSOXE, HX.HX_TENHANGXE, M.MODEL_TENMODEL
        ORDER BY TongDoanhThu DESC
        LIMIT 5
        `,
        [cx, year]
      );
    }
    res.json({
      tongQuan: (tongQuan && tongQuan[0]) ? tongQuan[0] : { tongDoanhThu: 0, tongLuot: 0, tongXe: 0 },
      luotThueThang: luotThueThang || [],
      topXeLuot: topXeLuot || [],
      topXeDoanhThu: topXeDoanhThu || [],
    });
  } catch (err) {
    console.error("Error /owner/stats:", err);
    res.status(500).json({ error: "Lỗi khi lấy thống kê", detail: err.message });
  }
});

/* Lấy thông tin Chủ xe  */
app.get("/owner/:id", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const id = req.params.id;
  try {
    const rows = await queryAsync(
      `SELECT * FROM CHU_XE WHERE CX_MACX = ? LIMIT 1`,
      [id]
    );
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "Không tìm thấy chủ xe" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi tải thông tin chủ xe" });
  }
});

/* Cập nhật thông tin Chủ xe  */
app.post("/update-owner/:id", async (req, res) => {
  // (Giữ nguyên logic của bạn)
  const id = req.params.id;
  const { CX_HOTENCX, CX_SODT, CX_EMAIL, CX_STK, CX_NGANHANG } = req.body;
  try {
    await queryAsync(
      `UPDATE CHU_XE SET CX_HOTENCX=?, CX_SODT=?, CX_EMAIL=?, CX_STK=?, CX_NGANHANG=? WHERE CX_MACX=?`,
      [CX_HOTENCX, CX_SODT, CX_EMAIL, CX_STK, CX_NGANHANG, id]
    );
    res.json({ ok: true, message: "Cập nhật thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi cập nhật thông tin chủ xe" });
  }
});

/*  ĐĂNG NHẬP ADMIN */
app.post("/admin/login", async (req, res) => {
  const { taiKhoan, matKhau } = req.body;
  if (!taiKhoan || !matKhau) return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
  try {
    const rows = await queryAsync(`SELECT * FROM ADMIN WHERE ADMIN_TAIKHOAN = ? LIMIT 1`, [taiKhoan]);
    if (rows.length === 0) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    const admin = rows[0];
    const match = admin.ADMIN_MATKHAU === matKhau || (await bcrypt.compare(matKhau, admin.ADMIN_MATKHAU));
    if (!match) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    
    res.json({
      ok: true,
      admin: {
        ADMIN_ID: admin.ADMIN_ID,
        ADMIN_TAIKHOAN: admin.ADMIN_TAIKHOAN,
        ADMIN_HOTEN: admin.ADMIN_HOTEN
      }
    });
  } catch (err) {
    console.error("Lỗi /admin/login:", err);
    res.status(500).json({ error: "Lỗi server khi đăng nhập admin" });
  }
});

/*  API THỐNG KÊ  */
app.get("/admin/stats", async (req, res) => {
  try {
    // 1. Thống kê theo Model (Top 10)
    const statsByModel = await queryAsync(`
      SELECT M.MODEL_TENMODEL, H.HX_TENHANGXE, COUNT(HDT.HDT_MAHDT) AS soLuot
      FROM HOP_DONG_THUE HDT
      JOIN XE X ON HDT.XE_MAXE = X.XE_MAXE
      JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
      GROUP BY M.MODEL_MAMODEL
      ORDER BY soLuot DESC
      LIMIT 10
    `);
    
    // 2. Thống kê theo Chủ xe (Top 10)
    const statsByOwner = await queryAsync(`
      SELECT C.CX_HOTENCX, COUNT(H.HDT_MAHDT) AS soLuot
      FROM HOP_DONG_THUE H
      JOIN CHU_XE C ON H.CX_MACX = C.CX_MACX
      GROUP BY H.CX_MACX
      ORDER BY soLuot DESC
      LIMIT 10
    `);
    
    // 3. Thống kê theo Thời gian (12 tháng qua)
    const statsByTime = await queryAsync(`
      SELECT DATE_FORMAT(HDT_NGAYGIOLAPHOPDONG, '%Y-%m') AS thang, COUNT(HDT_MAHDT) AS soLuot
      FROM HOP_DONG_THUE
      WHERE HDT_NGAYGIOLAPHOPDONG >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY thang
      ORDER BY thang ASC
    `);
    
    res.json({ statsByModel, statsByOwner, statsByTime });
  } catch (err) {
    console.error("Lỗi /admin/stats:", err);
    res.status(500).json({ error: "Lỗi khi tải thống kê" });
  }
});

/*  LẤY DANH SÁCH TẤT CẢ NGƯỜI DÙNG  */
app.get("/admin/users", async (req, res) => {
  try {
    const customers = await queryAsync("SELECT KH_SOCCCD, KH_TENND, KH_SODIENTHOAI, KH_EMAIL FROM KHACH_HANG");
    const owners = await queryAsync("SELECT CX_MACX, CX_HOTENCX, CX_SODT, CX_EMAIL FROM CHU_XE");
    res.json({ customers, owners });
  } catch (err) {
    console.error("Lỗi /admin/users:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách người dùng" });
  }
});

/*  LẤY DANH SÁCH TẤT CẢ XE  */
app.get("/admin/cars", async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;
  try {
    const [countRows] = await queryAsync("SELECT COUNT(XE_MAXE) AS total FROM XE");
    const totalCars = countRows.total || 0;
    
    const sql = `
      SELECT X.XE_MAXE, X.XE_BIENSOXE, M.MODEL_TENMODEL, H.HX_TENHANGXE, C.CX_HOTENCX
      FROM XE X
      LEFT JOIN MODEL M ON X.MODEL_MAMODEL = M.MODEL_MAMODEL
      LEFT JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
      LEFT JOIN (
        SELECT DISTINCT XE_MAXE, CX_MACX FROM BANG_GIA
      ) BG ON X.XE_MAXE = BG.XE_MAXE
      LEFT JOIN CHU_XE C ON BG.CX_MACX = C.CX_MACX
      ORDER BY X.XE_MAXE DESC
      LIMIT ? OFFSET ?
    `;
    const cars = await queryAsync(sql, [pageSize, offset]);
    res.json({ items: cars, total: totalCars, pageSize });
  } catch (err) {
    console.error("Lỗi /admin/cars:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách xe" });
  }
});

/*  LẤY DANH SÁCH HÃNG XE VÀ MODEL */
app.get("/admin/brands-and-models", async (req, res) => {
  try {
    const brands = await queryAsync("SELECT * FROM HANG_XE ORDER BY HX_TENHANGXE");
    const models = await queryAsync(`
      SELECT M.*, H.HX_TENHANGXE
      FROM MODEL M
      JOIN HANG_XE H ON M.HX_MAHANGXE = H.HX_MAHANGXE
      ORDER BY H.HX_TENHANGXE, M.MODEL_TENMODEL
    `);
    res.json({ brands, models });
  } catch (err) {
    console.error("Lỗi /admin/brands-and-models:", err);
    res.status(500).json({ error: "Lỗi khi tải hãng xe và model" });
  }
});

/*  THÊM HÃNG XE MỚI */
app.post("/admin/brands", async (req, res) => {
  // SỬA: Bỏ HX_MAHANGXE khỏi req.body
  const { HX_TENHANGXE, HX_LINKHINH } = req.body;
  if (!HX_TENHANGXE) return res.status(400).json({ error: "Tên hãng không được để trống" });
  try {
    // SỬA: Thêm logic tìm MAX ID
    // Lấy 'H001' -> 1, 'H002' -> 2, tìm MAX, rồi + 1
    const [lastBrand] = await queryAsync("SELECT MAX(CAST(SUBSTRING(HX_MAHANGXE, 2) AS UNSIGNED)) as maxIdNum FROM HANG_XE");
    const nextIdNum = (lastBrand.maxIdNum || 0) + 1;
    const newMaHang = 'H' + String(nextIdNum).padStart(3, '0'); // VD: 'H003'

    await queryAsync(
      "INSERT INTO HANG_XE (HX_MAHANGXE, HX_TENHANGXE, HX_LINKHINH) VALUES (?, ?, ?)",
      [newMaHang, HX_TENHANGXE, HX_LINKHINH || null] // SỬA: Dùng newMaHang
    );
    res.json({ ok: true, message: "Thêm hãng xe thành công" });
  } catch (err) {
    console.error("Lỗi POST /admin/brands:", err);
    res.status(500).json({ error: err.message });
  }
});

/*  CẬP NHẬT HÃNG XE */
app.put("/admin/brands/:id", async (req, res) => {
  const { id } = req.params;
  const { HX_TENHANGXE, HX_LINKHINH } = req.body;
  if (!HX_TENHANGXE) return res.status(400).json({ error: "Tên hãng không được để trống" });
  try {
    await queryAsync(
      "UPDATE HANG_XE SET HX_TENHANGXE = ?, HX_LINKHINH = ? WHERE HX_MAHANGXE = ?",
      [HX_TENHANGXE, HX_LINKHINH || null, id]
    );
    res.json({ ok: true, message: "Cập nhật hãng xe thành công" });
  } catch (err) {
    console.error("Lỗi PUT /admin/brands:", err);
    res.status(500).json({ error: err.message });
  }
});

/*  THÊM MODEL MỚI */
app.post("/admin/models", async (req, res) => {
  const { HX_MAHANGXE, MODEL_TENMODEL, MODEL_TRUYENDONG, MODEL_SOGHE, MODEL_NHIENLIEU, MODEL_TIEUHAO } = req.body;
  if (!HX_MAHANGXE || !MODEL_TENMODEL || !MODEL_SOGHE) return res.status(400).json({ error: "Thiếu thông tin Model" });
  try {
    // Lấy ID mới
    const [lastModel] = await queryAsync("SELECT MAX(MODEL_MAMODEL) as maxId FROM MODEL");
    const nextId = (lastModel.maxId || 0) + 1;
    
    await queryAsync(
      `INSERT INTO MODEL (MODEL_MAMODEL, HX_MAHANGXE, MODEL_TENMODEL, MODEL_TRUYENDONG, MODEL_SOGHE, MODEL_NHIENLIEU, MODEL_TIEUHAO) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nextId, HX_MAHANGXE, MODEL_TENMODEL, MODEL_TRUYENDONG || 'N/A', MODEL_SOGHE, MODEL_NHIENLIEU || 'N/A', MODEL_TIEUHAO || 'N/A']
    );
    res.json({ ok: true, message: "Thêm model thành công" });
  } catch (err) {
    console.error("Lỗi POST /admin/models:", err);
    res.status(500).json({ error: err.message });
  }
});

/*  CẬP NHẬT MODEL */
app.put("/admin/models/:id", async (req, res) => {
  const { id } = req.params;
  const { HX_MAHANGXE, MODEL_TENMODEL, MODEL_TRUYENDONG, MODEL_SOGHE, MODEL_NHIENLIEU, MODEL_TIEUHAO } = req.body;
  if (!HX_MAHANGXE || !MODEL_TENMODEL || !MODEL_SOGHE) return res.status(400).json({ error: "Thiếu thông tin Model" });
  try {
    await queryAsync(
      `UPDATE MODEL SET HX_MAHANGXE = ?, MODEL_TENMODEL = ?, MODEL_TRUYENDONG = ?, MODEL_SOGHE = ?, MODEL_NHIENLIEU = ?, MODEL_TIEUHAO = ?
       WHERE MODEL_MAMODEL = ?`,
      [HX_MAHANGXE, MODEL_TENMODEL, MODEL_TRUYENDONG || 'N/A', MODEL_SOGHE, MODEL_NHIENLIEU || 'N/A', MODEL_TIEUHAO || 'N/A', id]
    );
    res.json({ ok: true, message: "Cập nhật model thành công" });
  } catch (err) {
    console.error("Lỗi PUT /admin/models:", err);
    res.status(500).json({ error: err.message });
  }
});

/*  LẤY DANH SÁCH ĐIỀU KHOẢN CHUNG (ADMIN) */
app.get("/admin/terms", async (req, res) => {
  try {
    const terms = await queryAsync(
      "SELECT * FROM DIEU_KHOAN_SU_DUNG_DV WHERE CX_MACX IS NULL ORDER BY DKSDDV_NGAYGIONGUNGAPDUNG ASC, DKSDDV_NGAYGIOAPDUNG DESC"
    );
    res.json(terms);
  } catch (err) {
    console.error("Lỗi /admin/terms:", err);
    res.status(500).json({ error: "Lỗi khi tải điều khoản chung" });
  }
});

/*  THÊM ĐIỀU KHOẢN CHUNG MỚI */
app.post("/admin/terms", async (req, res) => {
  const { noiDung } = req.body;
  if (!noiDung) return res.status(400).json({ error: "Nội dung không được để trống" });

  try {
    const [lastTerm] = await queryAsync("SELECT MAX(DKSDDV_MADKSDDV) as maxId FROM DIEU_KHOAN_SU_DUNG_DV");
    const nextId = (lastTerm.maxId || 0) + 1;

    // CX_MACX là NULL cho điều khoản chung
    await queryAsync(
      `INSERT INTO DIEU_KHOAN_SU_DUNG_DV 
       (DKSDDV_MADKSDDV, CX_MACX, DKSDDV_NOIDUNG, DKSDDV_NGAYGIOAPDUNG, DKSDDV_NGAYGIONGUNGAPDUNG)
       VALUES (?, NULL, ?, NOW(), NULL)`,
      [nextId, noiDung]
    );
    res.json({ ok: true, message: "Thêm điều khoản chung thành công." });
  } catch (err) {
    console.error("Lỗi POST /admin/terms:", err);
    res.status(500).json({ error: "Lỗi khi thêm điều khoản." });
  }
});

/*  HỦY ĐIỀU KHOẢN CHUNG */
app.put("/admin/terms/:id/deactivate", async (req, res) => {
  const { id } = req.params;
  try {
    await queryAsync(
      `UPDATE DIEU_KHOAN_SU_DUNG_DV 
       SET DKSDDV_NGAYGIONGUNGAPDUNG = NOW() 
       WHERE DKSDDV_MADKSDDV = ? AND CX_MACX IS NULL`,
      [id]
    );
    res.json({ ok: true, message: "Hủy điều khoản thành công." });
  } catch (err) {
    console.error("Lỗi PUT /admin/terms:", err);
    res.status(500).json({ error: "Lỗi khi hủy điều khoản." });
  }
});

// Chạy mỗi phút một lần
cron.schedule('* * * * *', async () => {
  // console.log('[CRON] Đang kiểm tra trạng thái xe...');
  
  try {
    // --- PHẦN 1: TỰ ĐỘNG BẮT ĐẦU THUÊ (Chuyển sang trạng thái 2) ---
    // Tìm các xe có hợp đồng ĐANG DIỄN RA nhưng trạng thái hiện tại KHÁC 2 (Đang thuê)
    const carsToStart = await queryAsync(`
      SELECT H.XE_MAXE, H.CX_MACX, BG.CNTX_MACNTX, BG.TTX_MATTX, BG.BGTT_NGAYGIOBATDAU
      FROM HOP_DONG_THUE H
      JOIN BAN_GHI_TINH_TRANG BG ON H.XE_MAXE = BG.XE_MAXE
      WHERE 
        H.HDT_NGAYGIOBDTHUE <= NOW() AND H.HDT_NGAYGIOKTTHUE > NOW() -- Đang trong thời gian thuê
        AND BG.BGTT_NGAYGIOKETTHUC IS NULL -- Lấy trạng thái hiện tại
        AND BG.TTX_MATTX != 2 -- Trạng thái hiện tại KHÔNG PHẢI là 'Đang thuê'
    `);

    if (carsToStart.length > 0) {
      console.log(`[CRON] Tìm thấy ${carsToStart.length} xe cần chuyển sang 'Đang thuê'.`);
      
      for (const car of carsToStart) {
        // 1. Đóng trạng thái cũ
        await queryAsync(
          `UPDATE BAN_GHI_TINH_TRANG SET BGTT_NGAYGIOKETTHUC = NOW() 
           WHERE XE_MAXE = ? AND BGTT_NGAYGIOKETTHUC IS NULL`,
          [car.XE_MAXE]
        );
        
        // 2. Mở trạng thái mới (2: Đang thuê)
        // Lưu ý: Giữ nguyên Chi nhánh hiện tại (CNTX_MACNTX)
        await queryAsync(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
           VALUES (?, 2, ?, NOW(), NULL)`,
          [car.XE_MAXE, car.CNTX_MACNTX]
        );
      }
    }

    // --- PHẦN 2: TỰ ĐỘNG KẾT THÚC THUÊ (Chuyển về trạng thái 1) ---
    // Tìm các xe có hợp đồng ĐÃ KẾT THÚC nhưng trạng thái vẫn là 2 (Đang thuê)
    // Logic: Nếu không còn hợp đồng nào đang chạy, mà trạng thái vẫn là 2 -> Chuyển về 1
    const carsToEnd = await queryAsync(`
      SELECT BG.XE_MAXE, BG.CNTX_MACNTX
      FROM BAN_GHI_TINH_TRANG BG
      WHERE 
        BG.BGTT_NGAYGIOKETTHUC IS NULL -- Trạng thái hiện tại
        AND BG.TTX_MATTX = 2 -- Đang là 'Đang thuê'
        AND NOT EXISTS ( -- Và KHÔNG CÓ hợp đồng nào đang diễn ra cho xe này
          SELECT 1 FROM HOP_DONG_THUE H 
          WHERE H.XE_MAXE = BG.XE_MAXE 
          AND H.HDT_NGAYGIOBDTHUE <= NOW() AND H.HDT_NGAYGIOKTTHUE > NOW()
        )
    `);

    if (carsToEnd.length > 0) {
      console.log(`[CRON] Tìm thấy ${carsToEnd.length} xe cần trả về 'Sẵn sàng'.`);
      
      for (const car of carsToEnd) {
        // 1. Đóng trạng thái cũ (Đang thuê)
        await queryAsync(
          `UPDATE BAN_GHI_TINH_TRANG SET BGTT_NGAYGIOKETTHUC = NOW() 
           WHERE XE_MAXE = ? AND BGTT_NGAYGIOKETTHUC IS NULL`,
          [car.XE_MAXE]
        );
        
        // 2. Mở trạng thái mới (1: Sẵn sàng)
        await queryAsync(
          `INSERT INTO BAN_GHI_TINH_TRANG (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU, BGTT_NGAYGIOKETTHUC)
           VALUES (?, 1, ?, NOW(), NULL)`,
          [car.XE_MAXE, car.CNTX_MACNTX]
        );
      }
    }

  } catch (err) {
    console.error("[CRON] Lỗi khi tự động cập nhật trạng thái:", err);
  }
});

/* Listen  */
app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
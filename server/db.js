// db.js
import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Khang@280203",
  database: "httxtl"
});

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối CSDL:", err.message);
  } else {
    console.log("Kết nối MySQL thành công!");
  }
});

export default db;

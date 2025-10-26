const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper đọc/ghi db.json
function readDB() {
  return JSON.parse(fs.readFileSync("db.json", "utf8"));
}

function writeDB(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// ✅ GET /products → trả danh sách sản phẩm
app.get("/products", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// ✅ POST /products → thêm sản phẩm
app.post("/products", (req, res) => {
  const db = readDB();
  const newProduct = {
    id: uuidv4(),
    name: req.body.name,
    price: req.body.price
  };
  db.products.push(newProduct);
  writeDB(db);
  res.status(201).json(newProduct);
});

// ✅ PUT /products/:id → sửa sản phẩm
app.put("/products/:id", (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });

  db.products[index] = { ...db.products[index], ...req.body };
  writeDB(db);
  res.json(db.products[index]);
});

// ✅ DELETE /products/:id → xóa sản phẩm
app.delete("/products/:id", (req, res) => {
  const db = readDB();
  const updated = db.products.filter(p => p.id !== req.params.id);
  db.products = updated;
  writeDB(db);
  res.json({ message: "Đã xóa thành công" });
});

// Khởi động server
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));

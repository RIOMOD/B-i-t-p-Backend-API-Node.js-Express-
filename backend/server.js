const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "..", "db.json");

const app = express();

app.use(cors());
app.use(express.json());

async function readDatabase() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.products)) {
      throw new Error("Malformed data file: products must be an array");
    }

    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      const fallback = { products: [] };
      await writeDatabase(fallback);
      return fallback;
    }

    throw error;
  }
}

async function writeDatabase(data) {
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, payload, "utf8");
}

function validateProductInput({ name, price }, { partial = false } = {}) {
  const messages = [];

  if (!partial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      messages.push("Product name is required and must be a non-empty string.");
    }
  }

  if (!partial || price !== undefined) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      messages.push("Product price must be a non-negative number.");
    }
  }

  return {
    messages,
    sanitized: {
      name: name?.trim(),
      price: price !== undefined ? Number(price) : undefined
    }
  };
}

app.get("/products", async (req, res, next) => {
  try {
    const db = await readDatabase();
    res.json(db.products);
  } catch (error) {
    next(error);
  }
});

app.post("/products", async (req, res, next) => {
  try {
    const validation = validateProductInput(req.body);
    if (validation.messages.length > 0) {
      return res.status(400).json({ errors: validation.messages });
    }

    const db = await readDatabase();
    const newProduct = {
      id: uuidv4(),
      name: validation.sanitized.name,
      price: validation.sanitized.price
    };

    db.products.push(newProduct);
    await writeDatabase(db);

    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
});

app.put("/products/:id", async (req, res, next) => {
  try {
    const validation = validateProductInput(req.body, { partial: true });
    if (validation.messages.length > 0) {
      return res.status(400).json({ errors: validation.messages });
    }

    const db = await readDatabase();
    const productIndex = db.products.findIndex((item) => item.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found." });
    }

    const existing = db.products[productIndex];
    const updates = {};

    if (validation.sanitized.name !== undefined) {
      updates.name = validation.sanitized.name;
    }

    if (validation.sanitized.price !== undefined) {
      updates.price = validation.sanitized.price;
    }

    db.products[productIndex] = { ...existing, ...updates };
    await writeDatabase(db);

    res.json(db.products[productIndex]);
  } catch (error) {
    next(error);
  }
});

app.delete("/products/:id", async (req, res, next) => {
  try {
    const db = await readDatabase();
    const productIndex = db.products.findIndex((item) => item.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found." });
    }

    const [deleted] = db.products.splice(productIndex, 1);
    await writeDatabase(db);

    res.json({ message: "Product deleted successfully.", product: deleted });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Internal server error.",
    details: process.env.NODE_ENV === "development" ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});

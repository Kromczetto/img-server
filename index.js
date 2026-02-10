const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = req.body.jobId || "test";
    const dir = path.join(__dirname, "uploads", jobId);

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  }
});

app.post("/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const jobId = req.body.jobId || "test";
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${jobId}/${req.file.filename}`;

    res.status(200).json({
      imageUrl
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.delete("/delete-image", (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl required" });
  }

  try {
    const uploadsDir = path.join(__dirname, "uploads");

    const imagePath = path.normalize(
      imageUrl.replace(`${req.protocol}://${req.get("host")}/uploads`, uploadsDir)
    );

    if (!imagePath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: "Invalid image path" });
    }

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(imagePath);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});


app.delete("/delete-job/:jobId", (req, res) => {
  const { jobId } = req.params;
  const dirPath = path.join(__dirname, "uploads", jobId);

  if (!dirPath.startsWith(path.join(__dirname, "uploads"))) {
    return res.status(400).json({ error: "Invalid path" });
  }

  fs.rm(dirPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error("Folder delete error:", err);
      return res.status(500).json({ error: "Failed to delete job folder" });
    }

    res.status(200).json({ success: true });
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

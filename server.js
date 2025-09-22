// server.js
const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer: dosya yükleme için
const upload = multer({ dest: "uploads/" });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Küçük yardımcı: tüm boşlukları tek boşluğa indir, baş/son boşlukları kırp
function normalizeWhitespace(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}

// 📩 Mesaj gönderme endpoint’i
app.post("/gonder", upload.single("file"), async (req, res) => {
  const { email, mesaj } = req.body;
  const file = req.file;

  if (!email || !mesaj) {
    return res.status(400).json({ success: false, message: "Eksik bilgi" });
  }

  // Özet: ilk 3 kelime + tarih/saat (her tür boşlukla uyumlu)
  const temizMesaj = normalizeWhitespace(mesaj);
  const words = temizMesaj.length ? temizMesaj.split(" ") : [];
  const ozetIlk3 = words.slice(0, 3).join(" ");

  // Satır sonlarını tamamen kaldır, konu çok uzarsa kısalt (opsiyonel)
  const snippet = ozetIlk3.replace(/[\r\n]+/g, " ").slice(0, 60).trim();
  const tarih = new Date().toLocaleString("tr-TR");
  const subject = `[Yeni Dert] ${snippet} | ${tarih}`;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,   // kendi adresin
      to: process.env.EMAIL_USER,     // sana gelecek
      replyTo: email,                 // "Yanıtla" → kullanıcı
      subject,
      text: `Gönderen: ${email}\n\n${mesaj}`,
      attachments: file
        ? [{ filename: file.originalname, path: file.path }]
        : [],
    };

    await transporter.sendMail(mailOptions);

    if (file) fs.unlinkSync(file.path);

    res.json({ success: true, message: "Mesaj başarıyla gönderildi ✅" });
  } catch (error) {
    console.error("Mail gönderilemedi:", error);
    res.status(500).json({ success: false, message: "Mesaj gönderilemedi ❌" });
  }
});

// 🌐 index.html’i serve et
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🚀 Sunucuyu başlat
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT} 🚀`);
});

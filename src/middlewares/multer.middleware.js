// File: /middlewares/multer.js

import multer from "multer";

// Memory mein file store karne ke liye
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

export default upload;

import { config } from "./config/index.js";
import http from "http";
import mongoose from "mongoose";
import app from "./app.js";

const server = http.createServer(app);
const port = config.PORT || 8080;
mongoose
  .connect(config.MONGO_URI)
  .then((res) => {
    const conn = res.connection.host;
    server.listen(port, () => {
      console.log(`server running on ${port}`);
    });
  })
  .catch((error) => {
    console.log(error.message);
  });

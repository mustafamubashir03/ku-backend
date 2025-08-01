import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { Server } from "socket.io"
import {cache} from "./Cache/cache.js"
import {createServer} from "http"

const app=express()

app.use(cors({
    origin:"*",
}))

app.use(cookieParser());

app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));



app.use((req, res, next) => {
    console.log(req.method, req.ip);
    next();
})


const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",            // allow all origins (frontend, ESP32, etc.)
    methods: ["GET", "POST"]
},
    allowEIO3: true
});

io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Debug: log all events
  socket.onAny((event, ...args) => {
    console.log(`📨 [DEBUG] Event: ${event}`);
    console.log(`📦 Payload:`, args);
  });

  // Handle "busId" location data
  socket.on("busId", (payload) => {
    try {
      let parsed = payload;

      // Handle if sent as string from some client
      if (typeof payload === "string") {
        parsed = JSON.parse(payload);
      }

      console.log("🛰️ [SOCKET] Received busId data:", parsed);

      // Basic validation
      if (!parsed?.id) {
        console.warn("⚠️ [SOCKET] 'busId' event missing 'id'");
        return;
      }

      // Cache and re-emit
      cache.set(parsed.id, parsed);
      console.log("✅ [SOCKET] Cache updated");

      const channel = `busLocation-${parsed.id}`;
      io.emit(channel, parsed);
      console.log(`📡 [SOCKET] Emitted to ${channel}`);
    } catch (err) {
      console.error("❌ [SOCKET] Error handling 'busId' event:", err);
    }
  });

  socket.on("panicAlarm", (payload) => {
    console.log("🚨 [SOCKET] panicAlarm:", payload);
    socket.broadcast.emit("sendAlarm", payload);
  });

  socket.on("count", (payload) => {
    console.log("👥 [SOCKET] count:", payload);
    io.emit("sendCountPassenger", {
      countPassenger: payload?.countPassenger,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[SOCKET] Disconnected: ${socket.id}, reason: ${reason}`);
  });
});



//setting up routes
import busRouter from "./router/busRoute.js"

app.use("/api/v1",busRouter)

app.post("/send-location", (req, res) => {
  const { id, lat, lng } = req.body;

  if (!id || !lat || !lng) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const data = { id, lat, lng };

  // Cache the data (if needed)
  cache.set(id, data);

  // Emit via Socket.IO (same structure as your socket logic)
  io.emit(`busLocation-${id}`, data);
  console.log("📡 [HTTP] Emitted to busLocation-${id}:", data);

  res.status(200).json({ message: "Location received", data });
});

export default httpServer


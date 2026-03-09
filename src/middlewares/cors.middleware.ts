import cors from "cors";

const corsOptions: cors.CorsOptions = {
  origin: [process.env.ALLOWED_ORIGIN || "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export default cors(corsOptions);

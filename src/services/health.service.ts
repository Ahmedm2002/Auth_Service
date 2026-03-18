import ApiResponse from "../utils/responses/ApiResponse.js";
import ApiError from "../utils/responses/ApiError.js";
import { pool } from "../configs/db.js";

class HealthService {
  constructor() {}

  async serverHealth(): Promise<ApiResponse<any> | ApiError> {
    // App metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const formattedMemory = {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    };

    let dbStatus = "healthy";
    let dbLatency = "0 ms";

    try {
      const dbStartTime = Date.now();
      await pool.query("SELECT 1");
      dbLatency = `${Date.now() - dbStartTime} ms`;
    } catch (error) {
      dbStatus = "down";
    }

    const healthData = {
      app: {
        status: "up",
        uptime: Number(uptime.toFixed(2)),
        memoryUsage: formattedMemory,
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
    };

    if (dbStatus === "down") {
      return new ApiResponse(503, healthData, "Service unavailable");
    }

    return new ApiResponse(200, healthData, "Health check successful");
  }
}

const healthServ = new HealthService();
export default healthServ;

import express from "express";
import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health";
import { adminAuthRouter } from "./routes/adminAuth";
import { adminAccountsRouter } from "./routes/adminAccounts";
import { adminVehiclesRouter } from "./routes/adminVehicles";
import { adminImagesRouter } from "./routes/adminImages";
import { adminReportsRouter } from "./routes/adminReports";
import { adminPricesRouter } from "./routes/adminPrices";
import { publicMediaRouter } from "./routes/publicMedia";
import { publicVehiclesRouter } from "./routes/publicVehicles";
import { adminRecycleRouter } from "./routes/adminRecycle";
import { errorHandler } from "./middleware/errorHandler";
import { adminAuth } from "./middleware/adminAuth";
import { csrfOrigin } from "./middleware/csrfOrigin";
import { seedSuperAdminIfNeeded } from "./seed/superAdmin";
import { startPurgeScheduler } from "./services/purgeRecycleBin";
import { getObjectStorage } from "./lib/objectStorage";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(csrfOrigin);
app.use(adminAuth);
app.use(healthRouter);
app.use(adminAuthRouter);
app.use(adminAccountsRouter);
app.use(adminVehiclesRouter);
app.use(adminImagesRouter);
app.use(adminReportsRouter);
app.use(adminPricesRouter);
app.use(adminRecycleRouter);
app.use(publicVehiclesRouter);
app.use(publicMediaRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 8080;

seedSuperAdminIfNeeded()
  .then(() => {
    startPurgeScheduler();
    getObjectStorage();
    app.listen(port, () => {
      console.log(`server listening on :${port}`);
    });
  })
  .catch((err) => {
    console.error("种子超管失败", err);
    process.exit(1);
  });

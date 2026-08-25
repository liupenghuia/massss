import { app } from "./app";
import { seedSuperAdminIfNeeded } from "./seed/superAdmin";
import { startPurgeScheduler } from "./services/purgeRecycleBin";
import { getObjectStorage } from "./lib/objectStorage";

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

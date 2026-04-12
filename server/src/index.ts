import { app } from "./app.js";
import { startCronJobs } from "./jobs/index.js";

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`🚀 API running on http://localhost:${port}`);
  startCronJobs();
});

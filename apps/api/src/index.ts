import { loadAppEnv } from "./config";
import { initializeClinicDefinitionRepository } from "./persistence/clinic-definition-repository";
import { createAppRepositories } from "./persistence/app-repositories";
import { createApiServer } from "./server";
import { startIntelligenceScheduler } from "./intelligence-scheduler";

const start = async (): Promise<void> => {
  const env = loadAppEnv();
  await initializeClinicDefinitionRepository(env);
  const repositories = createAppRepositories(env);
  const server = createApiServer(env, repositories);

  startIntelligenceScheduler(env, repositories.marketIntelligence);

  server.listen(env.DAYSI_API_PORT, env.DAYSI_API_HOST, () => {
    console.log(
      `Daysi API bootstrap listening on http://${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`,
    );
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

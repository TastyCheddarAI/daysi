import { loadAppEnv } from "./config";
import { initializeClinicDefinitionRepository } from "./persistence/clinic-definition-repository";
import { createApiServer } from "./server";

const start = async (): Promise<void> => {
  const env = loadAppEnv();
  await initializeClinicDefinitionRepository(env);
  const server = createApiServer(env);

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

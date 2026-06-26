import { handleRelayRequest, type RelayEnv } from "../relay/relay";

export default {
  fetch(request: Request, env: RelayEnv): Promise<Response> {
    return handleRelayRequest(request, env);
  },
};

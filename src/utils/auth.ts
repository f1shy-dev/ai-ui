import { computed, signal } from "@preact/signals";
import { getJWTKey } from "./getJWTKey";

export const teamsEndpoint =
  window.location.hostname == "localhost"
    ? "http://localhost:8787"
    : "https://fakerss.f1shylabs.workers.dev";

export const teamsJWTKey = signal<string>(localStorage.getItem("jwt") || "");
export const openAIKey = signal<string>(localStorage.getItem("openai") || "");
export const isTeamsAuthenticated = computed(() => {
  if (!teamsJWTKey.value) return false;

  const jwt = teamsJWTKey.value.split(".");
  const payload = JSON.parse(atob(jwt[1]));
  return payload.exp > Date.now() / 1000;
});
export const openAIChatEndpoint = "https://api.openai.com/v1/chat/completions";
export const teamsOpenAIChatEndpoint = teamsEndpoint + "/v1c_relay";

export const authenticateTeams = async (user: string) => {
  try {
    const response = await fetch(`${teamsEndpoint}/jwt/${getJWTKey()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    teamsJWTKey.value = data.token;
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("teams-user", user);
    return true;
  } catch (e) {
    throw e;
  }
};

export const authenticateOpenAI = async (key: string) => {
  const response = await fetch(`https://api.openai.com/v1/models`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  openAIKey.value = key;
  localStorage.setItem("openai", key);
  return true;
};

export const checkTeamsAuth = async () => {
  try {
    const response = await fetch(`${teamsEndpoint}/check_auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teamsJWTKey.value}`,
      },
    });
    if (!response.ok) return false;
    return true;
  } catch (e) {
    return false;
  }
};

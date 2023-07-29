import { signal } from "@preact/signals";
import {
  openAIKey,
  authenticateOpenAI,
  teamsJWTKey,
  authenticateTeams,
  checkTeamsAuth,
} from "./auth";

export enum AuthState {
  InvalidAuth,
  NoAuth,
  Valid,
  Uncomputed,
}
export const teamsAuthState = signal<AuthState>(AuthState.Uncomputed);
export const openAIAuthState = signal<AuthState>(AuthState.Uncomputed);
export const updateAuthStates = async () => {
  if (openAIKey.value == "") openAIAuthState.value = AuthState.NoAuth;
  else if (openAIKey.value != "") openAIAuthState.value = AuthState.Valid;

  if (teamsJWTKey.value == "" && localStorage.getItem("teams-user") == null) {
    teamsAuthState.value = AuthState.NoAuth;
  } else {
    if (teamsJWTKey.value != "" && localStorage.getItem("teams-user") != null) {
      try {
        await authenticateTeams(localStorage.getItem("teams-user")!);
      } catch (e) {
        console.log(e);
        teamsAuthState.value = AuthState.InvalidAuth;
      }
    }
    if (teamsJWTKey.value) teamsAuthState.value = AuthState.Valid;
    else teamsAuthState.value = AuthState.InvalidAuth;
  }

  //now do the await checkTeamsAuth
  if (teamsAuthState.value == AuthState.Valid) {
    (await checkTeamsAuth())
      ? (teamsAuthState.value = AuthState.Valid)
      : (teamsAuthState.value = AuthState.InvalidAuth);
  }

  if (openAIAuthState.value == AuthState.Valid) {
    try {
      (await authenticateOpenAI(openAIKey.value))
        ? (openAIAuthState.value = AuthState.Valid)
        : (openAIAuthState.value = AuthState.InvalidAuth);
    } catch (e) {
      console.log(e);
      openAIAuthState.value = AuthState.InvalidAuth;
    }
  }
};

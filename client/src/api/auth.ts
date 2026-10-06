import { post } from "../api";
import type { LoginRequest, LoginResponse } from "../../../shared/src/types";

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse, LoginRequest>("/auth/login", credentials);
}

export function logout(): Promise<void> {
  return post<void>("/auth/login", {});
}

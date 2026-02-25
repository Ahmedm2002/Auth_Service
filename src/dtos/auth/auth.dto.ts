// dtos/auth.dto.ts
import type { SafeUserDto } from "../user/user.dto.js";

export interface LoginResDto {
  user: SafeUserDto;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

export interface SignupResDto {}

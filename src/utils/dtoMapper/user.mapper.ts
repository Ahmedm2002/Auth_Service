import type { userI } from "../../interfaces/index.js";
import type { SafeUserDto } from "../../dtos/user/user.dto.js";

function safeUserParse(user: userI): SafeUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profile_picture: user?.profile_picture ?? "",
    created_on: user?.created_on!,
  };
}

export default safeUserParse;

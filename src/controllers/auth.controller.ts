import type { Response, Request } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import authServ from "../services/auth.service.js";

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function loginUser(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body;
  try {
    const response = await authServ.login(email, password);

    return res
      .status(response.statusCode)
      .cookie("accessToken", response.data?.accessToken, CONSTANTS.cookieOpts)
      .cookie("refreshToken", response.data?.refreshToken, CONSTANTS.cookieOpts)
      .cookie("deviceId", response.data?.deviceId, CONSTANTS.cookieOpts)
      .json(response);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function getAllUsers(req: Request, res: Response): Promise<Response> {
  try {
    // const users: userI[] = await Users.getAllUsers();
    // if (users?.length === 0) {
    //   return res.status(200).json(new ApiResponse(200, "No users found"));
    // }
    return res.status(200);
    // .json(new ApiResponse(200, {}, "Users fetched successfully"));
  } catch (error: any) {
    console.log("Error getting all users: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
// async function signupUser(req: Request, res: Response): Promise<Response> {
//   const { name, password, email } = req.body;
//   try {
//     const validate = signupSchema.safeParse({
//       userName: name,
//       ...req.body,
//     });
//     if (!validate.success) {
//       return res
//         .status(400)
//         .json(new ApiError(400, "Invalid inputs fields", ["Invalid fields"]));
//     }
//     const existingUser = await user.getByEmail(email);
//     if (existingUser) {
//       return res
//         .status(409)
//         .json(new ApiError(409, "Email already exists", []));
//     }
//     const password_hash = await bcrypt.hash(password, 10);
//     const newUser: userI = await user.createUser({
//       name,
//       email,
//       password_hash,
//     });

//     // generate an email for email verification
//     // this is blocking code and increases latency for the signup api this should be added to a separate service for sending emails and not blocking the signup api flow
//     const token = await sendVerificationCode(email, name);
//     console.log("Token Send to ", newUser.email, ": ", token);
//     const token_hash = await bcrypt.hash(token, 10);
//     await verificationTokens.insert(newUser.id!, token_hash);

//     return res.status(200);
//     // .json(new ApiResponse(200, {}, "User created successfully"));
//   } catch (error: any) {
//     console.log("Error: ", error.message);
//     return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
//   }
// }

export { loginUser, getAllUsers };

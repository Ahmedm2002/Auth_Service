type CONSTS = {
  SERVER_ERROR: string;
  cookieOpts: {
    httpOnly: boolean;
    secure: boolean;
  };
  OTP_EXPIRY_MS: number;
};

const CONSTANTS: CONSTS = {
  SERVER_ERROR: "Something went wrong at our end. Please Try again later",
  cookieOpts: {
    httpOnly: true,
    secure: true,
  },
  OTP_EXPIRY_MS: 300000,
};

export default CONSTANTS;

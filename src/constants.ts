type CONSTS = {
  SERVER_ERROR: string;
  cookieOpts: {
    httpOnly: boolean;
    secure: boolean;
  };
};

const CONSTANTS: CONSTS = {
  SERVER_ERROR: "Something went wrong at our end. Please Try again later",
  cookieOpts: {
    httpOnly: true,
    secure: true,
  },
};

export default CONSTANTS;

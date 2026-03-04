import crypto from "node:crypto";

const code = crypto.randomInt(0, 4);

console.log(code);

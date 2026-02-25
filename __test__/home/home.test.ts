import request from "supertest";
import { app } from "../../src/app.js";

describe("Test the root path", () => {
  test("It should 200", () => {
    return request(app).get("/").expect(200);
  });
});

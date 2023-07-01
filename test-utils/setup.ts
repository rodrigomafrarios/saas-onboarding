jest.setTimeout(10_000);

let uuidVal = 0;
jest.mock("uuid", () => {
  return {
    v4: () =>
      `00000000-0000-4000-8000-${(uuidVal++).toString(16).padStart(12, "0")}`,
  };
});

let nanoidVal = 0;
jest.mock("nanoid", () => { return {
  nanoid : (length = 21) => (nanoidVal++).toString().padStart(length, "0")
}; });

beforeEach(() => {
  uuidVal = 0;
  nanoidVal = 0;
});

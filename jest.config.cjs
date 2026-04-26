/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$": "<rootDir>/test/fileMock.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json", useESM: true }],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transformIgnorePatterns: ["/node_modules/(?!(react-router-dom|@remix-run/router|@radix-ui|lucide-react)/)"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
}

import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // Schemat läses direkt ur API:ets kod, så ingen server behöver köra (viktigt i CI)
  schema: "../api/src/graphql/schema.js",
  documents: ["src/**/*.vue", "src/**/*.ts", "!src/gql/**/*"],
  generates: {
    "./src/gql/": {
      preset: "client",
      presetConfig: { fragmentMasking: false },
      config: { useTypeImports:true },
    },
  },
  ignoreNoDocuments: true,
};

export default config;

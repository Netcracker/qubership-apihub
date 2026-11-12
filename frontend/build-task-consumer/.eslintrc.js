module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@netcracker/qubership-apihub-api-processor/processor',
            message:
              "Heavy spec-processing engine (pulls the DDL parser + libpg-query WASM). Import it only where building actually runs (builder.service.ts); use the light '@netcracker/qubership-apihub-api-processor' root elsewhere.",
            allowTypeImports: true,
          },
          {
            name: '@netcracker/qubership-apihub-ddlapi/parser',
            message:
              "Pulls the DDL parser + libpg-query WASM. Use the parser-free '@netcracker/qubership-apihub-ddlapi' model root instead.",
            allowTypeImports: true,
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // builder.service.ts is the designated engine boundary: it may import the
      // api-processor /processor engine (and thus the DDL parser/WASM).
      files: ['src/modules/builder/builder.service.ts'],
      rules: {
        '@typescript-eslint/no-restricted-imports': 'off',
      },
    },
  ],
};

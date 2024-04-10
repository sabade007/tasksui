/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
module.exports = {
	extends: ['./node_modules/@zextras/carbonio-ui-configs/rules/eslint.js'],
	plugins: ['notice'],
	rules: {
		'notice/notice': [
			'error',
			{
				templateFile: './notice.template.js'
			}
		],
		'no-duplicate-imports': ['error', { includeExports: true }],
		'@typescript-eslint/consistent-type-imports': [
			'error',
			{
				fixStyle: 'inline-type-imports'
			}
		],
		'max-len': 'warn',
		'sonarjs/cognitive-complexity': 'warn',
		'sonarjs/no-duplicate-string': 'off'
	},
	overrides: [
		{
			// enable eslint-plugin-testing-library rules or preset only for test files
			files: [
				'**/+(test|jest)*.[jt]s?(x)',
				'**/types/commons.ts',
				'**/mocks/**/*',
				'**/gql/types.ts',
				'**/tests/**/*'
			],
			rules: {
				'import/no-extraneous-dependencies': 'off'
			}
		},
		{
			files: ['*.[jt]s(x)?'],
			processor: '@graphql-eslint/graphql',
			extends: ['plugin:prettier/recommended']
		},
		{
			files: ['*.graphql'],
			parser: '@graphql-eslint/eslint-plugin',
			plugins: ['@graphql-eslint'],
			rules: {
				'prettier/prettier': 'error',
				'@graphql-eslint/known-type-names': 'error',
				'notice/notice': 'off'
			},
			parserOptions: {
				operations: './src/gql/**/*.graphql',
				schema: './src/gql/schema.graphql'
			}
		}
	]
};

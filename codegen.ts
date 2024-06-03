/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { CodegenConfig } from '@graphql-codegen/cli';
import type { TypeScriptTypedDocumentNodesConfig } from '@graphql-codegen/typed-document-node';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';

const config: CodegenConfig = {
	overwrite: true,
	schema: {
		'https://raw.githubusercontent.com/zextras/carbonio-tasks-ce/develop/core/src/main/resources/api/schema.graphql':
			{
				headers: {
					Cookie: ''
				}
			}
	},
	generates: {
		'src/gql/schema.graphql': {
			plugins: [
				// https://the-guild.dev/graphql/codegen/plugins/other/schema-ast
				'schema-ast',
				// https://the-guild.dev/graphql/codegen/plugins/other/add
				{
					add: {
						content: [
							`
							# SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
							#
							# SPDX-License-Identifier: AGPL-3.0-only
							`,
							'" THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT! "'
						]
					}
				}
			]
		},
		'src/gql/types.ts': {
			documents: ['src/**/*.graphql'],
			plugins: [
				// https://the-guild.dev/graphql/codegen/plugins/typescript/typescript
				'typescript',
				// https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations
				'typescript-operations',
				// https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node
				'typed-document-node',
				// https://the-guild.dev/graphql/codegen/plugins/other/add
				{
					add: {
						content: [
							'/* eslint-disable camelcase,no-shadow */',
							'// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!'
						]
					}
				}
			],
			config: {
				defaultScalarType: 'unknown',
				exportFragmentSpreadSubTypes: true,
				mergeFragmentTypes: true,
				nonOptionalTypename: false,
				scalars: {
					DateTime: 'number'
				},
				strictScalars: true,
				useTypeImports: true
			} satisfies TypeScriptPluginConfig &
				TypeScriptTypedDocumentNodesConfig &
				TypeScriptDocumentsPluginConfig
		},
		'src/gql/possible-types.ts': {
			documents: ['src/**/*.graphql'],
			plugins: [
				'fragment-matcher',
				{ add: { content: '// THIS FILE IS AUTOGENERATED BY GRAPHQL-CODEGEN. DO NOT EDIT!' } }
			]
		}
	},
	hooks: {
		afterAllFileWrite:
			'eslint --fix --resolve-plugins-relative-to node_modules/@zextras/carbonio-ui-configs'
	}
};

export default config;

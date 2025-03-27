import { defineConfig } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    )),

    plugins: {
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
    },

    languageOptions: {
        globals: {
            ARGV: "readonly",
            Debugger: "readonly",
            GIRepositoryGType: "readonly",
            globalThis: "readonly",
            imports: "readonly",
            Intl: "readonly",
            log: "readonly",
            logError: "readonly",
            pkg: "readonly",
            print: "readonly",
            printerr: "readonly",
            window: "readonly",
            TextEncoder: "readonly",
            TextDecoder: "readonly",
            console: "readonly",
            setTimeout: "readonly",
            setInterval: "readonly",
            clearTimeout: "readonly",
            clearInterval: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "import/extensions": ["error", "ignorePackages"],
        "import/no-unresolved": "off",

        "max-len": ["warn", {
            code: 140,
            ignoreComments: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
        }],

        "no-use-before-define": ["error", {
            functions: false,
            classes: true,
            variables: true,
            allowNamedExports: true,
        }],

        "no-restricted-globals": ["error", {
            name: "Debugger",
            message: "Internal use only",
        }, {
            name: "GIRepositoryGType",
            message: "Internal use only",
        }, {
            name: "log",
            message: "Use debugLog()",
        }, {
            name: "logError",
            message: "Use errorLog()",
        }],

        "no-restricted-properties": ["error", {
            object: "imports",
            property: "format",
            message: "Use template strings",
        }, {
            object: "pkg",
            property: "initFormat",
            message: "Use template strings",
        }, {
            object: "Lang",
            property: "copyProperties",
            message: "Use Object.assign()",
        }, {
            object: "Lang",
            property: "bind",
            message: "Use arrow notation or Function.prototype.bind()",
        }, {
            object: "Lang",
            property: "Class",
            message: "Use ES6 classes",
        }],

        "no-restricted-syntax": ["error", {
            selector: "MethodDefinition[key.name=\"_init\"] CallExpression[arguments.length<=1][callee.object.type=\"Super\"][callee.property.name=\"_init\"]",
            message: "Use constructor() and super()",
        }],

        "no-constant-condition": ["warn", {
            checkLoops: false,
        }],
    },
}]);
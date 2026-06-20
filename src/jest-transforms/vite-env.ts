/**
 * ts-jest AST transformer that rewrites `import.meta.env` to a runtime
 * lookup against a global installed by setupTests.ts. Without this, ts-jest
 * compiles TypeScript to CommonJS where `import.meta` is a syntax error,
 * so any source file that reads Vite env vars (`import.meta.env.*`) fails
 * to parse under Jest — blocking test coverage for those modules (notably
 * src/App.tsx).
 *
 * The transformer swaps:
 *   import.meta.env            →  __VITE_ENV__
 *   import.meta.env.VITE_X     →  __VITE_ENV__.VITE_X
 *   import.meta.env.X ?? fb    →  __VITE_ENV__.X ?? fb
 *
 * It only touches property-access chains rooted at `import.meta.env`;
 * bare `import.meta` (without `.env`) is left alone because nothing in the
 * app reads it.
 *
 * Wiring: see jest.config.js `transform` → ts-jest `astTransformers.before`.
 *
 * Runtime counterpart: see src/setupTests.ts, which installs
 * `(global as any).__VITE_ENV__ = { VITE_GOOGLE_MAPS_API_KEY, ... }`.
 */
export const name = 'vite-env-transformer';
export const version = 1;

// Real runtime import — `import type` would be stripped by ts-jest's
// isolatedModules transpile, leaving `ts.` references undefined at runtime.
import * as ts from 'typescript';

/**
 * Legacy ts-jest transformer shape (ts-jest 29): the module exports a
 * `factory(program, options) => TransformerFactory<SourceFile>`. The
 * `factory` export is what `_makeTransformers` looks up.
 */
export function factory(
  _program: ts.Program,
  _options: Record<string, unknown>,
): ts.TransformerFactory<ts.SourceFile> {
  void _program;
  void _options;
  return (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
    const { factory } = context;

    const isImportMeta = (node: ts.Expression): boolean =>
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword &&
      node.name.text === 'meta';

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      // Match `import.meta.env` at the top of a property-access chain.
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === 'env' &&
        isImportMeta(node.expression)
      ) {
        return factory.createIdentifier('__VITE_ENV__');
      }
      // Recurse so nested `import.meta.env` (e.g. inside a binary expression
      // or call) is still rewritten.
      return ts.visitEachChild(node, visit, context);
    };

    return ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

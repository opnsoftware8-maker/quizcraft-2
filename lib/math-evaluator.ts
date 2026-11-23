import { create, all } from "mathjs";

export interface MathVariableInput {
  name: string;
  value: string | number;
}

export interface MathEvaluationResult {
  ok: boolean;
  formula: string;
  variables: Record<string, string>;
  result?: string;
  numericValue?: number;
  error?: string;
}

function createSafeMathInstance() {
  const math = create(all);

  // Support `ln(x)` as natural logarithm alias alongside `log(x)`
  math.import(
    {
      ln: (x: any) => math.log(x),
    },
    { override: true }
  );

  // Disable mutating functions for safe server-side evaluation
  const blocked = () => {
    throw new Error("Function is disabled in safe math evaluator");
  };
  math.import(
    {
      import: blocked,
      createUnit: blocked,
    },
    { override: true }
  );

  return math;
}

const safeMath = createSafeMathInstance();

const VALID_VAR_NAME = /^[a-zA-Z_][a-zA-Z0-9_]{0,31}$/;

function normalizeFormulaSyntax(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/\*\*/g, "^")
    .trim();
}

export function evaluateFormulaWithMathJs(params: {
  formula: string;
  variables?: MathVariableInput[];
}): MathEvaluationResult {
  const formula = normalizeFormulaSyntax(String(params.formula || ""));
  if (!formula) {
    return {
      ok: false,
      formula: "",
      variables: {},
      error: "Formula cannot be empty.",
    };
  }
  if (formula.length > 1000) {
    return {
      ok: false,
      formula: formula.slice(0, 1000),
      variables: {},
      error: "Formula exceeds maximum length (1000 characters).",
    };
  }

  const scope: Record<string, any> = {};
  const resolvedDisplayVars: Record<string, string> = {};

  const inputVars = Array.isArray(params.variables)
    ? params.variables.slice(0, 50)
    : [];

  for (const item of inputVars) {
    if (!item || typeof item.name !== "string") continue;
    const varName = item.name.trim();
    if (!VALID_VAR_NAME.test(varName)) {
      return {
        ok: false,
        formula,
        variables: resolvedDisplayVars,
        error: `Invalid variable name: "${varName}". Use letters, numbers, and underscores only.`,
      };
    }

    const rawVal = item.value;
    if (typeof rawVal === "number") {
      if (!Number.isFinite(rawVal)) {
        return {
          ok: false,
          formula,
          variables: resolvedDisplayVars,
          error: `Variable "${varName}" must be a finite number.`,
        };
      }
      scope[varName] = rawVal;
      resolvedDisplayVars[varName] = String(rawVal);
      continue;
    }

    const strVal = normalizeFormulaSyntax(String(rawVal ?? ""));
    if (!strVal || strVal.length > 200) {
      return {
        ok: false,
        formula,
        variables: resolvedDisplayVars,
        error: `Invalid value for variable "${varName}".`,
      };
    }

    try {
      const evaluatedVar = safeMath.evaluate(strVal);
      scope[varName] = evaluatedVar;
      resolvedDisplayVars[varName] = safeMath.format(evaluatedVar, {
        precision: 14,
      });
    } catch (varErr: any) {
      return {
        ok: false,
        formula,
        variables: resolvedDisplayVars,
        error: `Could not evaluate variable "${varName}" (${strVal}): ${
          varErr?.message || "Invalid expression"
        }`,
      };
    }
  }

  try {
    const rawResult = safeMath.evaluate(formula, scope);
    const formatted = safeMath.format(rawResult, { precision: 14 });
    const numericValue =
      typeof rawResult === "number" && Number.isFinite(rawResult)
        ? rawResult
        : undefined;

    return {
      ok: true,
      formula,
      variables: resolvedDisplayVars,
      result: formatted,
      numericValue,
    };
  } catch (evalErr: any) {
    return {
      ok: false,
      formula,
      variables: resolvedDisplayVars,
      error: evalErr?.message || "Failed to evaluate formula with Math.js.",
    };
  }
}

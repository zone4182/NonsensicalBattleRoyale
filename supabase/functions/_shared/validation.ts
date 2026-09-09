import { HttpError } from "./http.ts";

export function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "invalid_field", `'${field}' must be a non-empty string.`);
  }
  return value;
}

export function requireUuid(body: Record<string, unknown>, field: string): string {
  const value = requireString(body, field);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    throw new HttpError(400, "invalid_field", `'${field}' must be a UUID.`);
  }
  return value;
}

export function requirePositiveInt(body: Record<string, unknown>, field: string): number {
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "invalid_field", `'${field}' must be a positive integer.`);
  }
  return value;
}

export function requireOneOf<T extends string>(body: Record<string, unknown>, field: string, options: readonly T[]): T {
  const value = body[field];
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new HttpError(400, "invalid_field", `'${field}' must be one of: ${options.join(", ")}.`);
  }
  return value as T;
}

export function optionalIntInRange(body: Record<string, unknown>, field: string, min: number, max: number): number | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, "invalid_field", `'${field}' must be an integer between ${min} and ${max}.`);
  }
  return value;
}

export function optionalOneOf<T extends string>(body: Record<string, unknown>, field: string, options: readonly T[]): T | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new HttpError(400, "invalid_field", `'${field}' must be one of: ${options.join(", ")}.`);
  }
  return value as T;
}

export function optionalBoolean(body: Record<string, unknown>, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new HttpError(400, "invalid_field", `'${field}' must be a boolean.`);
  }
  return value;
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_field", `'${field}' must be a string.`);
  }
  return value;
}

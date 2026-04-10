export type OpenApiObject = Record<string, unknown>;

export const objectIdPattern = "^[a-fA-F0-9]{24}$";

export const nullData = { nullable: true, example: null };
export const publicUser = { $ref: "#/components/schemas/PublicUser" };
export const publicUsers = { type: "array", items: publicUser };

export function json(schema: OpenApiObject) {
  return { "application/json": { schema } };
}

export function envelope(data: OpenApiObject) {
  return {
    allOf: [
      { $ref: "#/components/schemas/SuccessEnvelope" },
      { type: "object", properties: { data } },
    ],
  };
}

export function response(
  description: string,
  data: OpenApiObject,
  status = 200,
) {
  return { [status]: { description, content: json(envelope(data)) } };
}

export function emptyResponse(description: string) {
  return { 204: { description } };
}

export function errors(...codes: number[]) {
  return Object.fromEntries(
    codes.map(code => [
      code,
      {
        description: {
          400: "Validation or malformed request error",
          401: "Authentication required or invalid credentials",
          403: "Forbidden",
          404: "Resource not found",
          409: "Resource conflict",
          413: "Request payload is too large",
          429: "Too many requests",
          500: "Unexpected server error",
        }[code] ?? "Request failed",
        content: json({ $ref: "#/components/schemas/ErrorEnvelope" }),
      },
    ]),
  );
}

export function body(schema: string) {
  return {
    required: true,
    content: json({ $ref: schema }),
  };
}

export const secured = [{ bearerAuth: [] }, { accessCookie: [] }];

export function objectIdParam(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { $ref: "#/components/schemas/ObjectId" },
  };
}

export const searchParam = {
  name: "search",
  in: "query",
  required: false,
  schema: { type: "string" },
};

export const unlockHeader = {
  name: "x-conversation-unlock-token",
  in: "header",
  required: false,
  description: "Temporary token returned by the conversation unlock endpoint.",
  schema: { type: "string" },
};

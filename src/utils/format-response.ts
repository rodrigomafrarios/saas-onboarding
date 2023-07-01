// FIXME: specify allowed headers and origin
export const formatJsonResponse = <T>(response: { statusCode: number; body: T; }) => ({
  statusCode: response.statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers" : "*",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
  },
  isBase64Encoded: false,
  body: typeof response.body === "string" ? response.body : JSON.stringify(response.body)
});

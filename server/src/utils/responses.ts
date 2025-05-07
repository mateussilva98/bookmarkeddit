// Format error response
export const formatErrorResponse = (
  status: number,
  message: string,
  retryAfter?: number
) => {
  const response: any = { error: message, status };

  if (retryAfter) {
    response.retryAfter = retryAfter;
  }

  return response;
};

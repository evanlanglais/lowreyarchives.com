export const useFlattenParam = (input: string | string[]): string => {
  if (typeof input === "string") {
    return input;
  } else if (Array.isArray(input)) {
    throw createError({
      statusMessage: "Input is an array, expected a single string",
      statusCode: 400,
    });
  }
  // This should never be reached if the type is correctly string | string[]
  throw createError({ statusMessage: "Unknown or invalid input type!" });
};

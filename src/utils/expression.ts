/* 
eslint-disable @typescript-eslint/no-unsafe-assignment,
@typescript-eslint/no-explicit-any,
@typescript-eslint/no-unsafe-argument,
@typescript-eslint/no-unsafe-member-access,
@typescript-eslint/restrict-template-expressions
 */

export const updateExpression = (data: object) =>
  `set ${Object.keys(data).map((key) => `#${key}=:${key}`)}`;

export const expressionAttributeNames = (data: object) =>
  Object.keys(data).reduce((previous, current) => ({
    ...previous,
    [`#${current}`]: current
  }), {});
export const expressionAttributeValues = (data: any) =>
  Object.keys(data).reduce((previous, current) => ({
    ...previous,
    [`:${current}`]: data[current]
  }), {});
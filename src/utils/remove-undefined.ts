/* 
eslint-disable @typescript-eslint/no-unsafe-assignment,
@typescript-eslint/no-explicit-any,
@typescript-eslint/no-unsafe-argument,
@typescript-eslint/no-unsafe-member-access,
@typescript-eslint/restrict-template-expressions,
@typescript-eslint/no-unsafe-return
 */

// FIXME: ts(2322)
export const removeUndefined = <T>(obj: object) =>
  Object
    .entries(obj)
    .reduce((prev: any, [key, value]) => (
      value === undefined ? prev : (prev[key] = value, prev)
    ), {}) as T;
export const REGEX_FILTER = /[-\/\\^$*+?.()|[\]{}]/g;
export const searchKeyword = (keyword?: string) => {
  return { $regex: keyword.replace(REGEX_FILTER, '\\$&'), $options: 'i' };
};

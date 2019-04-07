// import lo = require('lodash');
export function filter(rec: Record<string, any> | any[], query: any) {
  const lo = require('lodash');
  let data = rec;
  if (!Array.isArray(data)) data = rec && Object.values(rec);
  if (query.eq && data) data = lo.filter(data, query.eq);
  // TODO: Implement like
  return data;
}

/**
 * Parse pagination parameters from request query
 *
 * @param {Object} query - Express req.query object
 * @returns {Object} { limit, offset, page }
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20)); // Default 20, max 100
  const offset = (page - 1) * limit;

  return { limit, offset, page };
};

/**
 * Build pagination metadata for response
 *
 * @param {number} totalCount - Total number of records
 * @param {number} page - Current page number
 * @param {number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  parsePagination,
  buildPaginationMeta
};

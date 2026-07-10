// FastAPI returns `detail` as a plain string for HTTPException, but as an
// array of {type, loc, msg, input} objects for Pydantic validation (422)
// errors. Rendering that array directly as a React child crashes the page,
// so every error path funnels through here to get a displayable string.
export const formatApiErrorDetail = (detail, fallback = 'Something went wrong. Please try again.') => {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((d) => (typeof d === 'string' ? d : d.msg)).filter(Boolean);
    return messages.length ? messages.join(', ') : fallback;
  }
  return fallback;
};

export const getAxiosErrorMessage = (err, fallback) =>
  formatApiErrorDetail(err.response?.data?.detail, fallback);

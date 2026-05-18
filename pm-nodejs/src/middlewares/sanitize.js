const xss = require('xss');

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return xss(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      const sanitizedKey = key.replace(/\$/g, '').replace(/\./g, '');
      const sanitizedValue = sanitizeValue(value[key]);

      if (sanitizedKey !== key) {
        delete value[key];
        value[sanitizedKey] = sanitizedValue;
        return;
      }

      value[key] = sanitizedValue;
    });
  }

  return value;
};

const sanitize = () => (req, res, next) => {
  sanitizeValue(req.body);
  sanitizeValue(req.params);
  sanitizeValue(req.query);
  next();
};

module.exports = sanitize;
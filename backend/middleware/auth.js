const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ detail: 'Access token missing or invalid.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Token is invalid or expired.' });
  }
};

const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRoles };

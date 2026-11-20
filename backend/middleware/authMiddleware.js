const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization');

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify token (format: "Bearer <token>")
        const actualToken = token.split(' ')[1] || token;
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET || 'skite_secret_key');

        // Add user payload to request
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

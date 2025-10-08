const supabase = require('../supabaseClient');

const protect = async (req, res, next) => {
  let token;

  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {

      token = req.headers.authorization.split(' ')[1];

 
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
      }

    
      req.user = user; 
      next(); 
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

module.exports = { protect };
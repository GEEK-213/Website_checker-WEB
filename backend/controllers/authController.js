const supabase = require('../supabaseClient');

exports.registerUser = async (req, res) => {
  const { email, password } = req.body;
  try {

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    if (error) throw error;
    res.status(201).json({ 
      message: "Registration successful! Please check your email to verify.", 
      user: data.user 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
 
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) throw error;
    res.status(200).json({ 
      message: "Login successful!", 
      user: data.user, 
      session: data.session 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
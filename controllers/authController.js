const User = require('../models/User');
const Calculation = require('../models/Calculation');
const { generateToken } = require('../middleware/auth');

/**
 * Rejestracja nowego użytkownika
 */
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        message: existingUser.email === email ? 
          'User with this email already exists' : 
          'Username is already taken'
      });
    }

    
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    
    const token = generateToken(user._id, user.username);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toPublicJSON(),
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: `${field} is already taken`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Internal server error during registration'
    });
  }
};

/**
 * Logowanie użytkownika
 */
const login = async (req, res) => {
  try {
    const { login, password } = req.body; 

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Username/email and password are required'
      });
    }

    
    const user = await User.findOne({
      $or: [
        { username: login },
        { email: login }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username/email or password'
      });
    }

    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username/email or password'
      });
    }

    
    await user.updateLastLogin();

    
    const token = generateToken(user._id, user.username);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicJSON(),
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'Internal server error during login'
    });
  }
};

/**
 * Pobieranie profilu użytkownika
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    
    const stats = await Calculation.getUserStats(user._id);

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        stats
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile fetch failed',
      message: 'Internal server error while fetching profile'
    });
  }
};

/**
 * Aktualizacja profilu użytkownika
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user.userId;

    
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
          message: 'User with this email already exists'
        });
      }
    }

    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email })
      },
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found for update'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toPublicJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Profile update failed',
      message: 'Internal server error during profile update'
    });
  }
};

/**
 * Zmiana hasła
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing passwords',
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'Internal server error during password change'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
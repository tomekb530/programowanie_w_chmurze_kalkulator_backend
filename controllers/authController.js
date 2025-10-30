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
        error: 'Użytkownik już istnieje',
        message: existingUser.email === email ? 
          'Użytkownik z tym adresem email już istnieje' : 
          'Nazwa użytkownika jest już zajęta'
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
      message: 'Użytkownik zarejestrowany pomyślnie',
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
        error: 'Błąd walidacji',
        details: errors
      });
    }

    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Wartość już istnieje',
        message: `${field} jest już zajęty`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Rejestracja nieudana',
      message: 'Błąd wewnętrzny serwera podczas rejestracji'
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
        error: 'Brakuje danych logowania',
        message: 'Nazwa użytkownika/email i hasło są wymagane'
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
        error: 'Nieprawidłowe dane logowania',
        message: 'Nieprawidłowa nazwa użytkownika/email lub hasło'
      });
    }

    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowe dane logowania',
        message: 'Nieprawidłowa nazwa użytkownika/email lub hasło'
      });
    }

    
    await user.updateLastLogin();

    
    const token = generateToken(user._id, user.username);

    res.json({
      success: true,
      message: 'Logowanie pomyślne',
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
      error: 'Logowanie nieudane',
      message: 'Błąd wewnętrzny serwera podczas logowania'
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
        error: 'Użytkownik nie znaleziony',
        message: 'Profil użytkownika nie został znaleziony'
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
      error: 'Pobieranie profilu nieudane',
      message: 'Błąd wewnętrzny serwera podczas pobierania profilu'
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
          error: 'Email już istnieje',
          message: 'Użytkownik z tym adresem email już istnieje'
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
        error: 'Użytkownik nie znaleziony',
        message: 'Użytkownik nie został znaleziony do aktualizacji'
      });
    }

    res.json({
      success: true,
      message: 'Profil zaktualizowany pomyślnie',
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
        error: 'Błąd walidacji',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Aktualizacja profilu nieudana',
      message: 'Błąd wewnętrzny serwera podczas aktualizacji profilu'
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
        error: 'Brakuje haseł',
        message: 'Aktualne hasło i nowe hasło są wymagane'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Użytkownik nie znaleziony',
        message: 'Użytkownik nie został znaleziony'
      });
    }

    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowe hasło',
        message: 'Aktualne hasło jest nieprawidłowe'
      });
    }

    
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Hasło zmienione pomyślnie'
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
        error: 'Błąd walidacji',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Zmiana hasła nieudana',
      message: 'Błąd wewnętrzny serwera podczas zmiany hasła'
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
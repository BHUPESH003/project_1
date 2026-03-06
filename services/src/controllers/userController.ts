/**
 * User Controller - Currently unused
 * Available for future use
 */

// Placeholder file - all endpoints have been removed

/**
 * Get All Users
 */
export const getAllUsers = (req: Request, res: Response): void => {
  try {
    res.json(apiResponse(true, 'Users fetched successfully', users));
  } catch (error) {
    res.status(500).json(
      apiResponse(false, 'Failed to fetch users', null, 500)
    );
  }
};

/**
 * Get User by ID
 */
export const getUserById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const user = users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json(
        apiResponse(false, 'User not found', null, 404)
      );
      return;
    }

    res.json(apiResponse(true, 'User fetched successfully', user));
  } catch (error) {
    res.status(500).json(
      apiResponse(false, 'Failed to fetch user', null, 500)
    );
  }
};

/**
 * Create New User
 */
export const createUser = (req: Request, res: Response): void => {
  try {
    const { name, email } = req.body;

    // Validation
    if (!name || !email) {
      res.status(400).json(
        apiResponse(false, 'Name and email are required', null, 400)
      );
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json(
        apiResponse(false, 'Invalid email format', null, 400)
      );
      return;
    }

    // Check if email already exists
    if (users.some((u) => u.email === email)) {
      res.status(409).json(
        apiResponse(false, 'Email already exists', null, 409)
      );
      return;
    }

    // Create user
    const newUser: User = {
      id: generateId('user_'),
      name,
      email,
      createdAt: new Date(),
    };

    users.push(newUser);

    res.status(201).json(
      apiResponse(true, 'User created successfully', newUser, 201)
    );
  } catch (error) {
    res.status(500).json(
      apiResponse(false, 'Failed to create user', null, 500)
    );
  }
};

/**
 * Update User
 */
export const updateUser = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json(
        apiResponse(false, 'User not found', null, 404)
      );
      return;
    }

    if (email && !isValidEmail(email)) {
      res.status(400).json(
        apiResponse(false, 'Invalid email format', null, 400)
      );
      return;
    }

    // Update user
    if (name) user.name = name;
    if (email) user.email = email;

    res.json(apiResponse(true, 'User updated successfully', user));
  } catch (error) {
    res.status(500).json(
      apiResponse(false, 'Failed to update user', null, 500)
    );
  }
};

/**
 * Delete User
 */
export const deleteUser = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      res.status(404).json(
        apiResponse(false, 'User not found', null, 404)
      );
      return;
    }

    const deletedUser = users.splice(userIndex, 1);

    res.json(apiResponse(true, 'User deleted successfully', deletedUser[0]));
  } catch (error) {
    res.status(500).json(
      apiResponse(false, 'Failed to delete user', null, 500)
    );
  }
};

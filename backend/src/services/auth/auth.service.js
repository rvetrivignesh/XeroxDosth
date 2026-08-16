import User from '../../models/users/user.model.js';
import Shop from '../../models/Shop.js';
import ApiError from '../../utils/ApiError.js';
import generateToken from '../../utils/generateToken.js';

export const registerUser = async (name, email, password) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new ApiError(400, "User with this email already exists");
    }

    // Whitelist and create user. Ensure role and status are set appropriately.
    // Front-end cannot send/overwrite role and status as we only pass whitelisted fields.
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'USER',
        accountStatus: 'ACTIVE'
    });

    // Retrieve user without password field (since password field is select: false, standard select will exclude it)
    const userWithoutPassword = await User.findById(user._id);

    const token = generateToken(user._id, userWithoutPassword.role);

    return {
        user: userWithoutPassword,
        token
    };
};

export const loginUser = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Query user and explicitly select password since select: false is set in the schema
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Generic error: Never reveal if email exists or password is wrong
    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    // Check if user account is suspended or pending
    if (user.accountStatus !== 'ACTIVE') {
        throw new ApiError(403, `Account status is ${user.accountStatus.toLowerCase()}`);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError(401, "Invalid email or password");
    }

    const token = generateToken(user._id, user.role);

    // Convert Mongoose document to object to clean password field
    const userObject = user.toObject();
    delete userObject.password;

    return {
        user: userObject,
        token
    };
};

export const resignRole = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === 'USER') {
        throw new ApiError(400, "You are already a standard user");
    }

    const oldRole = user.role;
    user.role = 'USER';
    await user.save();

    if (oldRole === 'SHOP') {
        await Shop.updateMany(
            { owner: userId, status: 'APPROVED' },
            { status: 'REJECTED', rejectionReason: 'User resigned from Shop role' }
        );
    }

    return user;
};

export const getAdmins = async () => {
    const admins = await User.find({ role: 'ADMIN' }).select('-password').sort({ createdAt: -1 });
    return admins;
};

export const demoteAdmin = async (adminIdToDemote) => {
    const user = await User.findById(adminIdToDemote);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    user.role = 'USER';
    await user.save();
    return user;
};

export const loginOrCreateGoogleUser = async (googlePayload) => {
    const { sub: googleId, email, name } = googlePayload;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user with this email already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
        // Link to existing account if needed
        if (!user.googleId) {
            user.googleId = googleId;
            if (user.provider !== 'google') {
                user.provider = 'google';
            }
            await user.save();
        }
    } else {
        // Create a new user
        user = await User.create({
            name: name ? name.trim() : 'Google User',
            email: normalizedEmail,
            googleId,
            provider: 'google',
            role: 'USER',
            accountStatus: 'ACTIVE'
        });
    }

    // Check if user account is suspended or pending
    if (user.accountStatus !== 'ACTIVE') {
        throw new ApiError(403, `Account status is ${user.accountStatus.toLowerCase()}`);
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    const userObject = user.toObject();
    delete userObject.password;

    return {
        user: userObject,
        token
    };
};

export const searchUserByEmail = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('-password');
    if (!user) {
        throw new ApiError(404, "User not found with this email");
    }
    return user;
};

export const promoteToAdmin = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        throw new ApiError(404, "User not found with this email");
    }

    if (user.role === 'ADMIN') {
        throw new ApiError(400, "User is already an Administrator");
    }

    user.role = 'ADMIN';
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
};



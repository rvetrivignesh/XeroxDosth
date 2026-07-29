import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [60, "Name cannot exceed 60 characters"]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            unique: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: [function () {
                return !this.googleId;
            }, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            maxlength: [128, "Password cannot exceed 128 characters"],
            select: false
        },
        role: {
            type: String,
            enum: ["USER", "SHOP", "ADMIN"],
            default: "USER"
        },
        accountStatus: {
            type: String,
            enum: ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"],
            default: "ACTIVE"
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        provider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        }
    },
    {
        timestamps: true
    }
);

// Mongoose pre-save hook to hash passwords
userSchema.pre('save', async function () {
    // Only hash if modified
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare input password with hashed database password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

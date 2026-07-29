import mongoose from 'mongoose';

const roleApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, "User ID is required"]
        },
        requestedRole: {
            type: String,
            enum: {
                values: ['SHOP', 'ADMIN'],
                message: "Requested role must be either SHOP or ADMIN"
            },
            required: [true, "Requested role is required"]
        },
        applicantName: {
            type: String,
            required: [true, "Applicant name is required"],
            trim: true
        },
        shopName: {
            type: String,
            trim: true,
            required: [
                function () {
                    return this.requestedRole === 'SHOP';
                },
                "Shop name is required when requesting SHOP role"
            ]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const RoleApplication = mongoose.model('RoleApplication', roleApplicationSchema);

export default RoleApplication;

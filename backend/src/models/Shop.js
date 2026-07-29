import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, "Shop owner ID is required"]
        },
        shopName: {
            type: String,
            required: [true, "Shop name is required"],
            trim: true
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
            required: [true, "Description is required"],
            trim: true
        },
        location: {
            address: {
                type: String,
                required: [true, "Address is required"],
                trim: true
            },
            googleMapsLink: {
                type: String,
                trim: true,
                default: ""
            }
        },
        images: {
            type: [String],
            validate: [
                (val) => val.length <= 5,
                "Cannot store more than 5 images"
            ],
            default: []
        },
        openTiming: {
            open: {
                type: String,
                required: [true, "Opening time is required"],
                trim: true
            },
            close: {
                type: String,
                required: [true, "Closing time is required"],
                trim: true
            }
        },
        openDays: {
            type: [
                {
                    type: String,
                    enum: [
                        'MONDAY',
                        'TUESDAY',
                        'WEDNESDAY',
                        'THURSDAY',
                        'FRIDAY',
                        'SATURDAY',
                        'SUNDAY'
                    ]
                }
            ],
            required: [true, "Open days are required"],
            validate: [
                (val) => val.length > 0,
                "At least one open day must be specified"
            ]
        },
        pricing: {
            bwPerPage: {
                type: Number,
                required: [true, "Cost per black & white page is required"],
                min: [0, "Price cannot be negative"],
                default: 1
            },
            colorPerPage: {
                type: Number,
                required: [true, "Cost per coloured page is required"],
                min: [0, "Price cannot be negative"],
                default: 5
            },
            spiralBinding: {
                type: Number,
                required: [true, "Cost for spiral binding is required"],
                min: [0, "Price cannot be negative"],
                default: 30
            },
            bookBinding: {
                type: Number,
                required: [true, "Cost for book binding is required"],
                min: [0, "Price cannot be negative"],
                default: 50
            }
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
        },
        upiId: {
            type: String,
            required: [true, "UPI ID is required"],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Shop = mongoose.model('Shop', shopSchema);

export default Shop;

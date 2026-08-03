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
                min: [0, "Price cannot be negative"],
                default: 1
            },
            colorPerPage: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 5
            },
            spiralBinding: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 30
            },
            bookBinding: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 50
            }
        },
        printingRates: {
            bwSingle: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 1
            },
            bwDouble: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 1.5
            },
            colourSingle: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 5
            },
            colourDouble: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 8
            },
            spiralBinding: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 30
            },
            bookBinding: {
                type: Number,
                min: [0, "Price cannot be negative"],
                default: 50
            }
        },
        homeDelivery: {
            type: Boolean,
            default: false
        },
        freeDelivery: {
            type: Boolean,
            default: false
        },
        deliveryCharges: {
            type: [
                {
                    from: { type: Number, required: true },
                    to: { type: Number, required: true },
                    charge: { type: Number, required: true }
                }
            ],
            default: []
        },
        expressPrinting: {
            type: Boolean,
            default: false
        },
        freeExpressDelivery: {
            type: Boolean,
            default: false
        },
        expressDeliveryCharges: {
            type: [
                {
                    from: { type: Number, required: true },
                    to: { type: Number, required: true },
                    charge: { type: Number, required: true }
                }
            ],
            default: []
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
        isDeliveryAvailable: {
            type: Boolean,
            default: false
        },
        isCodAvailable: {
            type: Boolean,
            default: false
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

shopSchema.pre('save', function (next) {
    if (this.printingRates) {
        if (!this.pricing) this.pricing = {};
        this.pricing.bwPerPage = this.printingRates.bwSingle || 1;
        this.pricing.colorPerPage = this.printingRates.colourSingle || 5;
        this.pricing.spiralBinding = this.printingRates.spiralBinding || 30;
        this.pricing.bookBinding = this.printingRates.bookBinding || 50;
    }
    if (this.homeDelivery !== undefined) {
        this.isDeliveryAvailable = this.homeDelivery;
    }
    next();
});

const Shop = mongoose.model('Shop', shopSchema);

export default Shop;

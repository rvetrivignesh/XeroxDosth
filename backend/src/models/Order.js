import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: [true, 'publicId is required'],
            trim: true
        },
        url: {
            type: String,
            required: [true, 'url is required'],
            trim: true
        },
        originalName: {
            type: String,
            required: [true, 'originalName is required'],
            trim: true
        },
        size: {
            type: Number,
            required: [true, 'size is required']
        },
        mimeType: {
            type: String,
            required: [true, 'mimeType is required'],
            trim: true
        }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Customer ID is required']
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: [true, 'Shop ID is required']
        },
        documents: {
            type: [documentSchema],
            required: [true, 'Documents are required'],
            validate: [
                {
                    validator: function (val) {
                        return Array.isArray(val) && val.length >= 1 && val.length <= 10;
                    },
                    message: 'Order must contain between 1 and 10 documents'
                }
            ]
        },
        bwPages: {
            type: Number,
            required: [true, 'Number of black & white pages is required'],
            min: [0, 'Black & white pages cannot be negative'],
            default: 0
        },
        colorPages: {
            type: Number,
            required: [true, 'Number of color pages is required'],
            min: [0, 'Color pages cannot be negative'],
            default: 0
        },
        totalPages: {
            type: Number,
            required: [true, 'Total pages is required'],
            min: [1, 'Total pages must be at least 1']
        },
        copies: {
            type: Number,
            required: [true, 'Number of copies is required'],
            min: [1, 'Copies must be at least 1'],
            default: 1
        },
        printSide: {
            type: String,
            required: [true, 'Print side option is required'],
            enum: {
                values: ['SINGLE_SIDE', 'DOUBLE_SIDE'],
                message: 'Print side must be SINGLE_SIDE or DOUBLE_SIDE'
            }
        },
        binding: {
            type: String,
            required: [true, 'Binding option is required'],
            enum: {
                values: ['NONE', 'SPIRAL', 'BOOK'],
                message: 'Binding must be NONE, SPIRAL, or BOOK'
            }
        },
        requiredBy: {
            type: Date,
            required: [true, 'Required by date is required']
        },
        paymentMethod: {
            type: String,
            required: [true, 'Payment method is required'],
            enum: {
                values: ['ONLINE', 'COD'],
                message: 'Payment method must be ONLINE or COD'
            }
        },
        paymentStatus: {
            type: String,
            enum: {
                values: ['UNPAID', 'PAID', 'REFUNDED'],
                message: 'Invalid payment status'
            },
            default: 'UNPAID'
        },
        instructions: {
            type: String,
            trim: true,
            default: ''
        },
        fulfillmentType: {
            type: String,
            required: [true, 'Fulfillment type is required'],
            enum: {
                values: ['PICKUP', 'DELIVERY'],
                message: 'Fulfillment type must be PICKUP or DELIVERY'
            },
            default: 'PICKUP'
        },
        deliveryAddress: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: String,
            enum: {
                values: ['PENDING', 'ACCEPTED', 'REJECTED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'],
                message: 'Invalid order status'
            },
            default: 'PENDING'
        },
        transactionId: {
            type: String,
            trim: true,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

// Pre-validate hook to ensure totalPages is computed and accurate
orderSchema.pre('validate', function () {
    if (this.bwPages === undefined || this.bwPages === null) this.bwPages = 0;
    if (this.colorPages === undefined || this.colorPages === null) this.colorPages = 0;
    this.totalPages = this.bwPages + this.colorPages;
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

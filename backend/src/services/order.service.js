import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import User from '../models/users/user.model.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail } from './mail.service.js';
import { createNotification } from './notification.service.js';

export const createOrder = async (userId, orderData, io) => {
    // Verify that target shop exists
    const shop = await Shop.findById(orderData.shop).populate('owner');
    if (!shop) {
        throw new ApiError(404, 'Shop not found');
    }

    if (shop.owner && shop.owner._id.toString() === userId.toString()) {
        throw new ApiError(400, 'You cannot place an order from your own shop');
    }

    const customer = await User.findById(userId);
    if (!customer) {
        throw new ApiError(404, 'Customer user not found');
    }

    const bwSingleRate = shop.printingRates?.bwSingle ?? shop.pricing?.bwPerPage ?? 1;
    const bwDoubleRate = shop.printingRates?.bwDouble ?? shop.pricing?.bwPerPage ?? 1.5;
    const colourSingleRate = shop.printingRates?.colourSingle ?? shop.pricing?.colorPerPage ?? 5;

    let totalBwPages = 0;
    let totalColorPages = 0;
    let totalCopies = 1;
    let otherServiceCharges = 0;
    
    let bwSubtotal = 0;
    let colorSubtotal = 0;

    // Check if we have individual document configurations
    const hasDocConfigs = orderData.documents && orderData.documents.length > 0 && orderData.documents.some(d => d.pageCount !== undefined);

    if (hasDocConfigs) {
        for (const doc of orderData.documents) {
            const docBw = Number(doc.bwPages || 0);
            const docColor = Number(doc.colorPages || 0);
            const docCopies = Number(doc.copies || 1);
            const docPrintSide = doc.printSide || 'SINGLE_SIDE';

            if (docPrintSide === 'DOUBLE_SIDE' && docColor > 0) {
                throw new ApiError(400, 'Color printing is only available for single-sided printing.');
            }

            totalBwPages += docBw * docCopies;
            totalColorPages += docColor * docCopies;

            let docBwCost = 0;
            if (docPrintSide === 'DOUBLE_SIDE') {
                docBwCost = (Math.floor(docBw / 2) * bwDoubleRate + (docBw % 2) * bwSingleRate) * docCopies;
            } else {
                docBwCost = docBw * bwSingleRate * docCopies;
            }
            const docColorCost = docColor * colourSingleRate * docCopies;

            bwSubtotal += docBwCost;
            colorSubtotal += docColorCost;

            let docBindingCost = 0;
            if (doc.binding === 'SPIRAL') docBindingCost = shop.pricing.spiralBinding || 30;
            if (doc.binding === 'BOOK') docBindingCost = shop.pricing.bookBinding || 50;

            otherServiceCharges += docBindingCost * docCopies;
        }
    } else {
        totalBwPages = Number(orderData.bwPages || 0);
        totalColorPages = Number(orderData.colorPages || 0);
        totalCopies = Number(orderData.copies || 1);
        const rootPrintSide = orderData.printSide || 'SINGLE_SIDE';

        if (rootPrintSide === 'DOUBLE_SIDE' && totalColorPages > 0) {
            throw new ApiError(400, 'Color printing is only available for single-sided printing.');
        }

        let rootBwCost = 0;
        if (rootPrintSide === 'DOUBLE_SIDE') {
            rootBwCost = (Math.floor(totalBwPages / 2) * bwDoubleRate + (totalBwPages % 2) * bwSingleRate) * totalCopies;
        } else {
            rootBwCost = totalBwPages * bwSingleRate * totalCopies;
        }
        const rootColorCost = totalColorPages * colourSingleRate * totalCopies;

        bwSubtotal = rootBwCost;
        colorSubtotal = rootColorCost;

        let bindingCost = 0;
        if (orderData.binding === 'SPIRAL') bindingCost = shop.pricing.spiralBinding || 30;
        if (orderData.binding === 'BOOK') bindingCost = shop.pricing.bookBinding || 50;

        otherServiceCharges = bindingCost * totalCopies;
    }

    const totalPages = totalBwPages + totalColorPages;

    if (totalPages < 1) {
        throw new ApiError(400, 'Order must contain at least 1 page');
    }

    // Calculate delivery charge dynamically
    let deliveryCharge = 0;
    const isDelivery = (orderData.fulfillmentMethod === 'HOME_DELIVERY') || 
                       (orderData.fulfillmentMethod === 'RECORD_PICKUP' && orderData.deliveryType && orderData.deliveryType !== 'NONE');

    if (isDelivery) {
        if (!shop.isDeliveryAvailable) {
            throw new ApiError(400, 'Delivery is not available from this shop');
        }

        const deliveryDistance = Number(orderData.deliveryDistance || 0);
        const deliveryType = orderData.deliveryType || 'STANDARD';

        if (deliveryType === 'EXPRESS') {
            if (shop.freeExpressDelivery) {
                deliveryCharge = 0;
            } else {
                const slab = (shop.expressDeliveryCharges || []).find(
                    s => deliveryDistance >= s.from && deliveryDistance <= s.to
                );
                if (slab) {
                    deliveryCharge = slab.charge;
                } else {
                    throw new ApiError(400, `No express delivery pricing slab configured for distance: ${deliveryDistance} km`);
                }
            }
        } else {
            // STANDARD
            if (shop.freeDelivery) {
                deliveryCharge = 0;
            } else {
                const slab = (shop.deliveryCharges || []).find(
                    s => deliveryDistance >= s.from && deliveryDistance <= s.to
                );
                if (slab) {
                    deliveryCharge = slab.charge;
                } else {
                    throw new ApiError(400, `No standard delivery pricing slab configured for distance: ${deliveryDistance} km`);
                }
            }
        }
    }

    const totalAmount = bwSubtotal + colorSubtotal + otherServiceCharges + deliveryCharge;

    const order = await Order.create({
        customer: userId,
        shop: orderData.shop,
        documents: orderData.documents,
        bwPages: totalBwPages,
        colorPages: totalColorPages,
        totalPages,
        copies: hasDocConfigs ? 1 : totalCopies,
        printSide: orderData.printSide || 'SINGLE_SIDE',
        binding: orderData.binding || 'NONE',
        
        // New fields
        fulfillmentMethod: orderData.fulfillmentMethod,
        deliveryType: orderData.deliveryType || 'NONE',
        deliveryCharge,
        bwPerPagePrice: bwSingleRate,
        bwSubtotal,
        colorPerPagePrice: colourSingleRate,
        colorSubtotal,
        otherServiceCharges,
        totalAmount,
        paymentType: orderData.paymentType,

        // Legacy fields for compatibility
        fulfillmentType: isDelivery ? 'DELIVERY' : 'PICKUP',
        deliveryAddress: isDelivery ? (orderData.deliveryAddress || '') : '',
        requiredBy: orderData.requiredBy,
        paymentStatus: 'UNPAID',
        paymentMethod: orderData.paymentType, // Keep legacy paymentMethod in sync
        instructions: orderData.instructions || '',
        customerContact: orderData.customerContact || '',
        customerEmail: orderData.customerEmail || '',
        status: 'PENDING_SHOP_ACCEPTANCE',
        estimatedCost: totalAmount
    });

    // Notify Shop Owner
    if (shop.owner) {
        const orderIdStr = order._id.toString();
        const orderUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/shop-orders?orderId=${orderIdStr}`;
        
        await createNotification(io, {
            recipient: shop.owner._id,
            sender: userId,
            order: order._id,
            type: 'NEW_ORDER',
            title: 'New Print Order Received',
            message: `Order #${orderIdStr.slice(-6).toUpperCase()} of ${totalPages} pages placed by ${customer.name}.`
        });

        sendEmail({
            to: shop.email || shop.owner.email,
            subject: `[XeroxDosth] New Order #${orderIdStr.slice(-6).toUpperCase()} Received`,
            html: `
                <h3>New Order Received</h3>
                <p>Hello <strong>${shop.shopName}</strong>,</p>
                <p>You have received a new print job order on XeroxDosth.</p>
                <ul>
                    <li><strong>Order ID:</strong> #${orderIdStr.slice(-6).toUpperCase()}</li>
                    <li><strong>Customer Name:</strong> ${customer.name}</li>
                    <li><strong>Contact:</strong> ${order.customerContact}</li>
                    <li><strong>Email:</strong> ${order.customerEmail || 'N/A'}</li>
                    <li><strong>Document Copies:</strong> ${order.copies}</li>
                    <li><strong>Pages Breakdown:</strong> ${order.bwPages} B&W, ${order.colorPages} Color (${order.totalPages} total)</li>
                    <li><strong>Binding Preference:</strong> ${order.binding}</li>
                    <li><strong>Fulfillment Method:</strong> ${order.fulfillmentType}</li>
                    <li><strong>Estimated Cost:</strong> ₹${order.estimatedCost}</li>
                </ul>
                <p><a href="${orderUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Details</a></p>
                <p>Thank you,<br/>XeroxDosth Team</p>
            `
        });

    }

    return order;
};

export const getUserOrders = async (userId) => {
    const orders = await Order.find({ customer: userId })
        .sort({ createdAt: -1 })
        .populate('shop', 'shopName location phone email upiId upiQrCode isCodAvailable');

    return orders;
};

export const getShopOrders = async (userId) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const orders = await Order.find({ shop: shop._id })
        .sort({ createdAt: -1 })
        .populate('customer', 'name email phone');

    return orders;
};

export const updateOrderStatus = async (userId, orderId, status, paymentStatus, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();

    const orderIdStr = order._id.toString();

    // Trigger status transition notifications
    if (status) {
        let title = 'Order Status Updated';
        let msg = `Your Order #${orderIdStr.slice(-6).toUpperCase()} is now ${status}.`;
        
        if (status === 'IN_PROGRESS') {
            title = 'Order In Progress';
            msg = `Printing has started for Order #${orderIdStr.slice(-6).toUpperCase()}.`;
        } else if (status === 'READY_FOR_PICKUP') {
            title = 'Order Ready for Pickup';
            msg = `Your print order #${orderIdStr.slice(-6).toUpperCase()} is ready for pickup at the shop.`;
        } else if (status === 'OUT_FOR_DELIVERY') {
            title = 'Order Out for Delivery';
            msg = `Your print order #${orderIdStr.slice(-6).toUpperCase()} is out for delivery.`;
        } else if (status === 'COMPLETED') {
            title = 'Order Completed';
            msg = `Thank you! Your order #${orderIdStr.slice(-6).toUpperCase()} is completed.`;
        }

        await createNotification(io, {
            recipient: order.customer._id,
            sender: userId,
            order: order._id,
            type: status,
            title,
            message: msg
        });

        if (status === 'COMPLETED') {
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] ${title}`,
                html: `
                    <h3>Order Completed</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>${msg}</p>
                    <p>Order ID: #${orderIdStr.slice(-6).toUpperCase()}</p>
                    <p>Thank you for using XeroxDosth!</p>
                `
            });
        } else if (status === 'OUT_FOR_DELIVERY') {
            const orderConfirmationUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/my-orders?orderId=${orderIdStr}`;
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] ${title}`,
                html: `
                    <h3>Order Out for Delivery</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>Good news! ${msg}</p>
                    <p>Order ID: #${orderIdStr.slice(-6).toUpperCase()}</p>
                    <p>You can track the progress of your order here:</p>
                    <p><a href="${orderConfirmationUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Track Order Status</a></p>
                    <p>Thank you for using XeroxDosth!</p>
                `
            });
        }
    }

    if (paymentStatus === 'PAID') {
        const title = 'Payment Confirmed';
        const msg = `Your payment for Order #${orderIdStr.slice(-6).toUpperCase()} has been confirmed by the shop.`;
        
        await createNotification(io, {
            recipient: order.customer._id,
            sender: userId,
            order: order._id,
            type: 'PAYMENT_CONFIRMED',
            title,
            message: msg
        });

        const orderConfirmationUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/my-orders?orderId=${orderIdStr}`;
        sendEmail({
            to: order.customerEmail || order.customer.email,
            subject: `[XeroxDosth] ${title} for Order #${orderIdStr.slice(-6).toUpperCase()}`,
            html: `
                <h3>Payment Confirmed</h3>
                <p>Hello <strong>${order.customer.name}</strong>,</p>
                <p>${msg}</p>
                <p><strong>Amount Paid:</strong> ₹${order.finalPrice || order.estimatedCost}</p>
                <p>You can track the progress of your order here:</p>
                <p><a href="${orderConfirmationUrl}" style="padding: 10px 15px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Details</a></p>
                <p>Thank you for using XeroxDosth!</p>
            `
        });
    }

    return order;
};

const formatEstimatedTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? timeStr : date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const acceptOrder = async (userId, orderId, { finalPrice, estimatedDeliveryTime }, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    if (!finalPrice || finalPrice <= 0) {
        throw new ApiError(400, 'Please provide a valid final price');
    }

    if (!estimatedDeliveryTime) {
        throw new ApiError(400, 'Please specify an estimated delivery/completion timeline');
    }

    const previousStatus = order.status;
    const isCod = order.paymentType === 'COD' || order.paymentMethod === 'COD';

    if (isCod) {
        order.status = 'IN_PROGRESS';
        order.paymentMethod = 'COD';
        order.paymentStatus = 'UNPAID';
    } else {
        order.status = 'PAYMENT_REQUESTED';
    }

    order.finalPrice = finalPrice;
    order.estimatedDeliveryTime = estimatedDeliveryTime;
    await order.save();

    const orderIdStr = order._id.toString();
    const paymentRequestUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/payment-request/${order._id}`;
    const orderConfirmationUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/my-orders?orderId=${orderIdStr}`;

    // Only send notification/email if transitioning from PENDING_SHOP_ACCEPTANCE
    // This avoids duplicate notifications/emails if the order details are resubmitted.
    if (previousStatus === 'PENDING_SHOP_ACCEPTANCE') {
        const notificationMsg = isCod 
            ? `Shop accepted order #${orderIdStr.slice(-6).toUpperCase()}. Approved Price: ₹${finalPrice}. Printing is in progress.`
            : `Shop accepted order #${orderIdStr.slice(-6).toUpperCase()}. Approved Price: ₹${finalPrice}. Please complete payment.`;

        await createNotification(io, {
            recipient: order.customer?._id || order.customer,
            sender: userId,
            order: order._id,
            type: isCod ? 'IN_PROGRESS' : 'PAYMENT_REQUESTED',
            title: isCod ? 'Order Confirmed (COD)' : 'Order Accepted & Payment Requested',
            message: notificationMsg
        });

        if (isCod) {
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} Accepted & In Progress (COD)`,
                html: `
                    <h3>Your Order Has Been Approved!</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>The shop has reviewed and accepted your print job order. Printing is now in progress!</p>
                    <ul>
                        <li><strong>Order ID:</strong> #${orderIdStr.slice(-6).toUpperCase()}</li>
                        <li><strong>Payment Method:</strong> Cash on Delivery (COD)</li>
                        <li><strong>Final Exact Price:</strong> ₹${finalPrice}</li>
                        <li><strong>Estimated Completion Time:</strong> ${formatEstimatedTime(estimatedDeliveryTime)}</li>
                    </ul>
                    <p>Please keep this amount ready during delivery/pickup.</p>
                    <p>You can track your order status here:</p>
                    <p><a href="${orderConfirmationUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Status</a></p>
                    <p>Thank you,<br/>XeroxDosth Team</p>
                `
            });
        } else {
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} Accepted - Payment Required`,
                html: `
                    <h3>Your Order Has Been Approved!</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>The shop has reviewed and accepted your print job order.</p>
                    <ul>
                        <li><strong>Order ID:</strong> #${orderIdStr.slice(-6).toUpperCase()}</li>
                        <li><strong>Final Exact Price:</strong> ₹${finalPrice}</li>
                        <li><strong>Estimated Completion Time:</strong> ${formatEstimatedTime(estimatedDeliveryTime)}</li>
                    </ul>
                    <p>To process this print order, please complete your payment on the Payment Request page:</p>
                    <p><a href="${paymentRequestUrl}" style="padding: 10px 15px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Payment Request</a></p>
                    <p>Thank you,<br/>XeroxDosth Team</p>
                `
            });
        }
    }

    return order;
};

export const rejectOrder = async (userId, orderId, { rejectionReason }, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    order.status = 'REJECTED_BY_SHOP';
    order.rejectionReason = rejectionReason || 'Shop is busy or materials are out of stock.';
    await order.save();

    const orderIdStr = order._id.toString();

    await createNotification(io, {
        recipient: order.customer._id,
        sender: userId,
        order: order._id,
        type: 'REJECTED_BY_SHOP',
        title: 'Order Rejected by Shop',
        message: `Order #${orderIdStr.slice(-6).toUpperCase()} rejected. Reason: ${order.rejectionReason}`
    });

    sendEmail({
        to: order.customerEmail || order.customer.email,
        subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} Rejected`,
        html: `
            <h3>Order Rejection Notice</h3>
            <p>Hello <strong>${order.customer.name}</strong>,</p>
            <p>Unfortunately, your print order #${orderIdStr.slice(-6).toUpperCase()} was rejected by the shop.</p>
            <p><strong>Reason for rejection:</strong> ${order.rejectionReason}</p>
            <p>You can try placing an order at another shop on our website.</p>
            <p>Thank you,<br/>XeroxDosth Team</p>
        `
    });

    return order;
};

export const cancelOrder = async (userId, orderId, io) => {
    const order = await Order.findOne({ _id: orderId, customer: userId }).populate('shop');
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.status !== 'PENDING_SHOP_ACCEPTANCE') {
        throw new ApiError(400, 'Orders can only be cancelled directly before shop acceptance.');
    }

    order.status = 'CANCELLED_BY_USER';
    await order.save();

    const orderIdStr = order._id.toString();
    const shop = await Shop.findById(order.shop._id).populate('owner');
    if (shop && shop.owner) {
        await createNotification(io, {
            recipient: shop.owner._id,
            sender: userId,
            order: order._id,
            type: 'CANCELLED_BY_USER',
            title: 'Order Cancelled by Customer',
            message: `Customer cancelled order #${orderIdStr.slice(-6).toUpperCase()} before acceptance.`
        });
    }

    return order;
};

export const requestCancellation = async (userId, orderId, { cancellationReason }, io) => {
    const order = await Order.findOne({ _id: orderId, customer: userId }).populate('shop');
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    const unallowedStatuses = ['CANCELLED', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLATION_APPROVED'];
    if (unallowedStatuses.includes(order.status)) {
        throw new ApiError(400, `Cannot request cancellation for order in ${order.status} state.`);
    }

    order.status = 'CANCELLATION_REQUESTED';
    order.cancellationReason = cancellationReason || 'Changed my mind.';
    await order.save();

    const orderIdStr = order._id.toString();
    const shop = await Shop.findById(order.shop._id).populate('owner');
    if (shop && shop.owner) {
        await createNotification(io, {
            recipient: shop.owner._id,
            sender: userId,
            order: order._id,
            type: 'CANCELLATION_REQUESTED',
            title: 'Cancellation Requested',
            message: `User requested cancellation for #${orderIdStr.slice(-6).toUpperCase()}. Reason: ${order.cancellationReason}`
        });

        const orderUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/shop-orders?orderId=${orderIdStr}`;
        sendEmail({
            to: shop.email || shop.owner.email,
            subject: `[XeroxDosth] Cancellation Request for Order #${orderIdStr.slice(-6).toUpperCase()}`,
            html: `
                <h3>Order Cancellation Request</h3>
                <p>Hello <strong>${shop.shopName}</strong>,</p>
                <p>The customer has requested to cancel their order <strong>#${orderIdStr.slice(-6).toUpperCase()}</strong>.</p>
                <p><strong>Reason:</strong> ${order.cancellationReason}</p>
                <p>If printing has NOT started, please approve this cancellation request from your shop dashboard:</p>
                <p><a href="${orderUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Cancellation Request</a></p>
                <p>Thank you,<br/>XeroxDosth Team</p>
            `
        });
    }

    return order;
};

export const approveCancellation = async (userId, orderId, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    if (order.status !== 'CANCELLATION_REQUESTED') {
        throw new ApiError(400, 'Order cancellation is not requested.');
    }

    order.status = 'CANCELLATION_APPROVED';
    order.paymentStatus = 'REFUNDED'; // Mark as refunded if they paid online
    await order.save();

    const orderIdStr = order._id.toString();

    await createNotification(io, {
        recipient: order.customer._id,
        sender: userId,
        order: order._id,
        type: 'CANCELLATION_APPROVED',
        title: 'Cancellation Request Approved',
        message: `Your cancellation request for order #${orderIdStr.slice(-6).toUpperCase()} was approved.`
    });

    return order;
};

export const rejectCancellation = async (userId, orderId, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    if (order.status !== 'CANCELLATION_REQUESTED') {
        throw new ApiError(400, 'Order cancellation is not requested.');
    }

    // Restore to printing state (IN_PROGRESS)
    order.status = 'CANCELLATION_REJECTED';
    await order.save();

    // After setting status to CANCELLATION_REJECTED, automatically move it to IN_PROGRESS so printing continues
    order.status = 'IN_PROGRESS';
    await order.save();

    const orderIdStr = order._id.toString();

    await createNotification(io, {
        recipient: order.customer._id,
        sender: userId,
        order: order._id,
        type: 'CANCELLATION_REJECTED',
        title: 'Cancellation Request Rejected',
        message: `Your cancellation request for order #${orderIdStr.slice(-6).toUpperCase()} was rejected as printing has started.`
    });

    return order;
};

export const payOrder = async (userId, orderId, { paymentMethod, transactionId, paymentScreenshot }, io) => {
    const order = await Order.findOne({ _id: orderId, customer: userId }).populate('shop').populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.status !== 'PAYMENT_REQUESTED') {
        throw new ApiError(400, 'Order is not in payment requested state.');
    }

    // Force paymentMethod to match order's original paymentType
    const originalPaymentType = order.paymentType || 'UPI';
    if (paymentMethod !== originalPaymentType) {
        throw new ApiError(400, `You cannot change the payment option. Original choice was ${originalPaymentType}.`);
    }

    if (paymentMethod === 'UPI') {
        if (!transactionId || transactionId.trim() === '') {
            throw new ApiError(400, 'Transaction reference ID is required for UPI payments');
        }
        order.status = 'PAYMENT_COMPLETED';
        order.paymentMethod = 'UPI';
        order.transactionId = transactionId.trim();
        if (paymentScreenshot) {
            order.paymentScreenshot = paymentScreenshot;
        }
        order.paymentStatus = 'UNPAID'; // Paid status to be confirmed by shop owner
    } else if (paymentMethod === 'COD') {
        // If COD, move directly to IN_PROGRESS since no advance payment is needed
        order.status = 'IN_PROGRESS';
        order.paymentMethod = 'COD';
        order.paymentStatus = 'UNPAID';
    } else {
        throw new ApiError(400, 'Invalid payment method selected. Must be UPI or COD.');
    }

    await order.save();

    const orderIdStr = order._id.toString();
    const shop = await Shop.findById(order.shop._id).populate('owner');
    if (shop && shop.owner) {
        await createNotification(io, {
            recipient: shop.owner._id,
            sender: userId,
            order: order._id,
            type: order.status,
            title: order.status === 'IN_PROGRESS' ? 'COD Order Confirmed' : 'UPI Payment Submitted',
            message: order.status === 'IN_PROGRESS' 
                ? `Customer confirmed COD for order #${orderIdStr.slice(-6).toUpperCase()}. Printing can start.` 
                : `Payment reference submitted for order #${orderIdStr.slice(-6).toUpperCase()}.`
        });

        const orderUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/shop-orders?orderId=${orderIdStr}`;
        const orderConfirmationUrl = `${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/my-orders?orderId=${orderIdStr}`;

        sendEmail({
            to: shop.email || shop.owner.email,
            subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} Payment/COD Confirmed`,
            html: `
                <h3>Order Payment Action</h3>
                <p>Hello <strong>${shop.shopName}</strong>,</p>
                <p>The customer has completed the payment action for order <strong>#${orderIdStr.slice(-6).toUpperCase()}</strong>.</p>
                <ul>
                    <li><strong>Payment Method chosen:</strong> ${paymentMethod}</li>
                    ${paymentMethod === 'UPI' ? `<li><strong>UPI Txn Ref ID:</strong> ${order.transactionId}</li>` : ''}
                    ${paymentMethod === 'UPI' && order.paymentScreenshot ? `<li><strong>Screenshot:</strong> <a href="${order.paymentScreenshot}">View Screenshot</a></li>` : ''}
                    <li><strong>Order Status:</strong> ${order.status}</li>
                </ul>
                <p>Please check your dashboard to process the order:</p>
                <p><a href="${orderUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Details</a></p>
                <p>Thank you,<br/>XeroxDosth Team</p>
            `
        });

        if (paymentMethod === 'COD') {
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} COD Confirmed`,
                html: `
                    <h3>Cash on Delivery Confirmed</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>You have confirmed Cash on Delivery (COD) for your order <strong>#${orderIdStr.slice(-6).toUpperCase()}</strong>.</p>
                    <p><strong>Final Amount to Pay:</strong> ₹${order.finalPrice}</p>
                    <p>Please keep this amount ready during delivery/pickup.</p>
                    <p>You can track your order status here:</p>
                    <p><a href="${orderConfirmationUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Status</a></p>
                    <p>Thank you,<br/>XeroxDosth Team</p>
                `
            });
        } else if (paymentMethod === 'UPI') {
            sendEmail({
                to: order.customerEmail || order.customer.email,
                subject: `[XeroxDosth] Order #${orderIdStr.slice(-6).toUpperCase()} Payment Submitted`,
                html: `
                    <h3>Payment Details Submitted</h3>
                    <p>Hello <strong>${order.customer.name}</strong>,</p>
                    <p>Your payment details for print order <strong>#${orderIdStr.slice(-6).toUpperCase()}</strong> have been submitted to the shop owner for verification.</p>
                    <p><strong>UPI Transaction Ref ID:</strong> ${order.transactionId}</p>
                    <p>You can view and track your order status here:</p>
                    <p><a href="${orderConfirmationUrl}" style="padding: 10px 15px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View Order Status</a></p>
                    <p>Thank you,<br/>XeroxDosth Team</p>
                `
            });
        }

    }

    return order;
};

export const getOrderById = async (userId, orderId) => {
    const order = await Order.findById(orderId)
        .populate('shop', 'shopName location phone email upiId upiQrCode isCodAvailable owner')
        .populate('customer', 'name email phone');

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    const requestingUser = await User.findById(userId);
    if (!requestingUser) {
        throw new ApiError(404, 'User not found');
    }

    const isCustomer = order.customer._id.toString() === userId.toString();
    const isShopOwner = order.shop?.owner?.toString() === userId.toString();
    const isAdmin = requestingUser.role === 'ADMIN';

    if (!isCustomer && !isShopOwner && !isAdmin) {
        throw new ApiError(403, 'Not authorized to access this order');
    }

    return order;
};

export const requestPaymentAgain = async (userId, orderId, { reason }, io) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id }).populate('customer');
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    const unallowedStatuses = ['CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED', 'COMPLETED'];
    if (unallowedStatuses.includes(order.status)) {
        throw new ApiError(400, `Cannot request payment again for order in ${order.status} state.`);
    }

    order.status = 'PAYMENT_REQUESTED';
    order.paymentStatus = 'UNPAID';
    order.transactionId = '';
    order.paymentScreenshot = '';
    await order.save();

    const orderIdStr = order._id.toString();
    const customerMsg = reason 
        ? `Payment requested again for order #${orderIdStr.slice(-6).toUpperCase()}. Reason: ${reason}` 
        : `Shop requested payment again for order #${orderIdStr.slice(-6).toUpperCase()}.`;

    await createNotification(io, {
        recipient: order.customer._id,
        sender: userId,
        order: order._id,
        type: 'PAYMENT_REQUESTED',
        title: 'Payment Requested Again',
        message: customerMsg
    });

    sendEmail({
        to: order.customerEmail || order.customer.email,
        subject: `[XeroxDosth] Action Required: Payment Requested Again for Order #${orderIdStr.slice(-6).toUpperCase()}`,
        html: `
            <h3>Payment Requested Again</h3>
            <p>Hello <strong>${order.customer.name}</strong>,</p>
            <p>The shop owner for your order #${orderIdStr.slice(-6).toUpperCase()} has requested payment again.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>Please visit the payment request page to submit your payment details (transaction ID and screenshot):</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://rvetrivignesh.github.io/XeroxDosth/#'}/payment-request/${order._id}" style="padding: 10px 15px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Payment Request</a></p>
            <p>Thank you,<br/>XeroxDosth Team</p>
        `
    });

    return order;
};

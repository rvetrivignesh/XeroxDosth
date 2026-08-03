import Shop from '../models/Shop.js';
import User from '../models/users/user.model.js';
import ApiError from '../utils/ApiError.js';

export const applyForShop = async (userId, shopData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role !== 'USER') {
        throw new ApiError(400, `Only users with USER role can apply for a shop (current role: ${user.role})`);
    }

    // Check if user already has a pending shop application
    const existingPending = await Shop.findOne({
        owner: userId,
        status: 'PENDING'
    });

    if (existingPending) {
        throw new ApiError(400, "You already have a pending shop application");
    }

    const {
        shopName,
        email,
        phone,
        description,
        location,
        images,
        openTiming,
        openDays,
        pricing,
        upiId,
        isDeliveryAvailable,
        isCodAvailable
    } = shopData;

    const shop = await Shop.create({
        owner: userId,
        shopName,
        email,
        phone,
        description,
        location: {
            address: location.address,
            googleMapsLink: location.googleMapsLink || ""
        },
        images: images || [],
        openTiming: {
            open: openTiming.open,
            close: openTiming.close
        },
        openDays,
        pricing: {
            bwPerPage: pricing?.bwPerPage !== undefined ? Number(pricing.bwPerPage) : 1,
            colorPerPage: pricing?.colorPerPage !== undefined ? Number(pricing.colorPerPage) : 5,
            spiralBinding: pricing?.spiralBinding !== undefined ? Number(pricing.spiralBinding) : 30,
            bookBinding: pricing?.bookBinding !== undefined ? Number(pricing.bookBinding) : 50
        },
        isDeliveryAvailable: !!isDeliveryAvailable,
        isCodAvailable: !!isCodAvailable,
        upiId,
        status: 'PENDING'
    });

    return shop;
};

export const mapShopForBackwardCompatibility = (shop) => {
    if (!shop) return null;
    const shopObj = typeof shop.toObject === 'function' ? shop.toObject() : shop;
    
    // Fallback: If printingRates is missing, build it from pricing
    if (!shopObj.printingRates && shopObj.pricing) {
        shopObj.printingRates = {
            bwSingle: shopObj.pricing.bwPerPage ?? 1,
            bwDouble: shopObj.pricing.bwPerPage ?? 1,
            colourSingle: shopObj.pricing.colorPerPage ?? 5,
            colourDouble: shopObj.pricing.colorPerPage ?? 5,
            spiralBinding: shopObj.pricing.spiralBinding ?? 30,
            bookBinding: shopObj.pricing.bookBinding ?? 50
        };
    }
    
    // Fallback for homeDelivery
    if (shopObj.homeDelivery === undefined && shopObj.isDeliveryAvailable !== undefined) {
        shopObj.homeDelivery = shopObj.isDeliveryAvailable;
    }
    
    return shopObj;
};

export const getMyShopApplication = async (userId) => {
    const shop = await Shop.findOne({ owner: userId }).sort({ createdAt: -1 });
    return mapShopForBackwardCompatibility(shop);
};

export const updateMyShopDetails = async (userId, updateData) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, "Shop not found for this user");
    }

    if (updateData.shopName) shop.shopName = updateData.shopName;
    if (updateData.email) shop.email = updateData.email;
    if (updateData.phone) shop.phone = updateData.phone;
    if (updateData.description) shop.description = updateData.description;
    if (updateData.upiId) shop.upiId = updateData.upiId;
    if (updateData.isCodAvailable !== undefined) shop.isCodAvailable = !!updateData.isCodAvailable;
    if (updateData.location) {
        if (updateData.location.address) shop.location.address = updateData.location.address;
        if (updateData.location.googleMapsLink !== undefined) shop.location.googleMapsLink = updateData.location.googleMapsLink;
    }
    if (updateData.images) shop.images = updateData.images;
    if (updateData.openTiming) {
        if (updateData.openTiming.open) shop.openTiming.open = updateData.openTiming.open;
        if (updateData.openTiming.close) shop.openTiming.close = updateData.openTiming.close;
    }
    if (updateData.openDays) shop.openDays = updateData.openDays;
    
    // Update new printing rates & delivery range tables
    if (updateData.printingRates) {
        shop.printingRates = {
            bwSingle: Number(updateData.printingRates.bwSingle ?? 0),
            bwDouble: Number(updateData.printingRates.bwDouble ?? 0),
            colourSingle: Number(updateData.printingRates.colourSingle ?? 0),
            colourDouble: Number(updateData.printingRates.colourDouble ?? 0),
            spiralBinding: Number(updateData.printingRates.spiralBinding ?? 0),
            bookBinding: Number(updateData.printingRates.bookBinding ?? 0)
        };
    }
    if (updateData.homeDelivery !== undefined) shop.homeDelivery = !!updateData.homeDelivery;
    if (updateData.freeDelivery !== undefined) shop.freeDelivery = !!updateData.freeDelivery;
    if (updateData.deliveryCharges !== undefined) shop.deliveryCharges = updateData.deliveryCharges;
    if (updateData.expressPrinting !== undefined) shop.expressPrinting = !!updateData.expressPrinting;
    if (updateData.freeExpressDelivery !== undefined) shop.freeExpressDelivery = !!updateData.freeExpressDelivery;
    if (updateData.expressDeliveryCharges !== undefined) shop.expressDeliveryCharges = updateData.expressDeliveryCharges;

    await shop.save();
    return mapShopForBackwardCompatibility(shop);
};

export const getAllShops = async () => {
    const shops = await Shop.find().populate('owner', 'name email phone role').sort({ createdAt: -1 });
    return shops.map(mapShopForBackwardCompatibility);
};

export const getAllApprovedShops = async () => {
    const shops = await Shop.find({ status: 'APPROVED' }).sort({ createdAt: -1 });
    return shops.map(mapShopForBackwardCompatibility);
};

export const updateShopStatus = async (adminId, shopId, status, rejectionReason) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new ApiError(404, "Shop not found");
    }

    shop.status = status;
    shop.reviewedBy = adminId;
    shop.reviewedAt = new Date();
    if (rejectionReason) shop.rejectionReason = rejectionReason;

    // If approved, update owner's role to SHOP. If rejected/demoted, update owner's role to USER.
    if (status === 'APPROVED') {
        const owner = await User.findById(shop.owner);
        if (owner && owner.role === 'USER') {
            owner.role = 'SHOP';
            await owner.save();
        }
    } else if (status === 'REJECTED') {
        const owner = await User.findById(shop.owner);
        if (owner && owner.role === 'SHOP') {
            owner.role = 'USER';
            await owner.save();
        }
    }

    await shop.save();
    return mapShopForBackwardCompatibility(shop);
};


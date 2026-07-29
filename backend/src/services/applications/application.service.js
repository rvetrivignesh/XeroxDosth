import RoleApplication from '../../models/applications/roleApplication.model.js';
import User from '../../models/users/user.model.js';
import ApiError from '../../utils/ApiError.js';

export const submitApplication = async (userId, data) => {
    const { requestedRole, applicantName, shopName, email, phone, description } = data;

    // Fetch user to check current role
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === requestedRole) {
        throw new ApiError(400, `You already hold the ${requestedRole} role`);
    }

    // Check for existing pending application for the same requested role
    const existingPending = await RoleApplication.findOne({
        user: userId,
        requestedRole,
        status: 'PENDING'
    });

    if (existingPending) {
        throw new ApiError(400, `You already have a pending application for the ${requestedRole} role`);
    }

    const applicationData = {
        user: userId,
        requestedRole,
        applicantName,
        email,
        phone,
        description,
        ...(requestedRole === 'SHOP' && { shopName })
    };

    const application = await RoleApplication.create(applicationData);
    return application;
};

export const getUserApplications = async (userId) => {
    const applications = await RoleApplication.find({ user: userId }).sort({ createdAt: -1 });
    return applications;
};

export const withdrawApplication = async (userId, applicationId) => {
    const application = await RoleApplication.findOne({ _id: applicationId, user: userId });

    if (!application) {
        throw new ApiError(404, "Application not found");
    }

    if (application.status !== 'PENDING') {
        throw new ApiError(400, "Only pending applications can be withdrawn");
    }

    await RoleApplication.findByIdAndDelete(applicationId);
    return { id: applicationId };
};

export const getAllApplications = async () => {
    const applications = await RoleApplication.find()
        .populate('user', 'name email role')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 });
    return applications;
};

export const getApplicationById = async (applicationId) => {
    const application = await RoleApplication.findById(applicationId)
        .populate('user', 'name email role')
        .populate('reviewedBy', 'name email');

    if (!application) {
        throw new ApiError(404, "Application not found");
    }

    return application;
};

export const approveApplication = async (adminId, applicationId) => {
    const application = await RoleApplication.findById(applicationId);

    if (!application) {
        throw new ApiError(404, "Application not found");
    }

    if (application.status !== 'PENDING') {
        throw new ApiError(400, `Application has already been ${application.status.toLowerCase()}`);
    }

    // Update applicant user's role
    const targetUser = await User.findById(application.user);
    if (!targetUser) {
        throw new ApiError(404, "Applicant user no longer exists");
    }

    targetUser.role = application.requestedRole;
    await targetUser.save();

    // Update application details
    application.status = 'APPROVED';
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    return application;
};

export const rejectApplication = async (adminId, applicationId, rejectionReason) => {
    const application = await RoleApplication.findById(applicationId);

    if (!application) {
        throw new ApiError(404, "Application not found");
    }

    if (application.status !== 'PENDING') {
        throw new ApiError(400, `Application has already been ${application.status.toLowerCase()}`);
    }

    application.status = 'REJECTED';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    return application;
};

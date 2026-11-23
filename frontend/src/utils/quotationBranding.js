import { topImage, bottomImage, sealImage, signImage } from '../assets/robotriqImages';

const robotriqAssets = {
    quotationHeaderImage: topImage,
    quotationFooterImage: bottomImage,
    quotationSeal: sealImage,
    quotationSign: signImage,
};

export function isRobotriqQuotationTenant(user) {
    const tenantId = String(user?.tenantId?._id || user?.tenantId || '');
    if (user?.isSkiteTenant || tenantId === '6af2c94a9d29730751ed2d01') return false;
    return tenantId === '6afd35731172da4b0de9a48e' || user?.subDomain?.toLowerCase() === 'robotriq' ||
        Boolean(user?.companyName?.toLowerCase().includes('robotriq'));
}

export function quotationAssets(data = {}, isRobotriq) {
    const saved = {
        quotationHeaderImage: data.quotationHeaderImage,
        quotationFooterImage: data.quotationFooterImage,
        quotationSeal: data.quotationSeal || data.invoiceSeal,
        quotationSign: data.quotationSign || data.invoiceSign,
    };
    return Object.fromEntries(Object.entries(saved).map(([key, value]) => {
        if (isRobotriq) return [key, value || robotriqAssets[key]];
        return [key, value && !Object.values(robotriqAssets).includes(value) ? value : ''];
    }));
}

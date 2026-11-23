import { topImage, bottomImage, sealImage, signImage } from '../assets/robotriqImages';

const robotriqAssets = {
    quotationHeaderImage: topImage,
    quotationFooterImage: bottomImage,
    quotationSeal: sealImage,
    quotationSign: signImage,
};

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

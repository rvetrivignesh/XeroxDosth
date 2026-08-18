/**
 * Backend Page Details Formatting Utility
 * Standardizes page range formatting and document printing requirements for emails/APIs.
 */

/**
 * Parses string input or numeric array into a sorted unique array of page numbers.
 * Supports ranges like "1-5, 8, 10-12" or "1–5".
 */
export const parsePageList = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
        return Array.from(new Set(
            input
                .map(n => typeof n === 'number' ? n : parseInt(String(n).trim(), 10))
                .filter(n => Number.isInteger(n) && n > 0)
        )).sort((a, b) => a - b);
    }

    const text = String(input).trim();
    if (!text) return [];

    const pages = new Set();
    const parts = text.split(',');

    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;

        // Support hyphen (-) and en-dash (–)
        const rangeMatch = trimmed.match(/^(\d+)\s*[\-–]\s*(\d+)$/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    pages.add(i);
                }
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num > 0) {
                pages.add(num);
            }
        }
    });

    return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Formats a list or array of page numbers into continuous compact ranges.
 */
export const formatPageRanges = (pagesInput, totalDocPages = 0, options = {}) => {
    const pages = parsePageList(pagesInput);
    if (pages.length === 0) return '';

    const isAllPages = Boolean(
        totalDocPages > 0 && 
        pages.length === totalDocPages && 
        pages[0] === 1 && 
        pages[pages.length - 1] === totalDocPages
    );

    // Group into continuous ranges
    const ranges = [];
    let start = pages[0];
    let prev = pages[0];

    for (let i = 1; i < pages.length; i++) {
        const current = pages[i];
        if (current === prev + 1) {
            prev = current;
        } else {
            ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
            start = current;
            prev = current;
        }
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);

    const rangeStr = ranges.join(', ');

    if (isAllPages && options.includeAllPrefix) {
        return `All pages · 1–${totalDocPages}`;
    }

    return rangeStr;
};

/**
 * Normalizes document settings into structured categories.
 */
export const getPageDetails = (doc = {}) => {
    const pageCount = Number(doc.pageCount || 1);
    const copies = Number(doc.copies || 1);
    const binding = doc.binding || 'NONE';
    const isAdvanced = doc.printingMode === 'advanced';

    const categories = [];

    if (isAdvanced) {
        const bwSingle = parsePageList(doc.bwSinglePages || doc.bwSinglePagesText);
        const bwDouble = parsePageList(doc.bwDoublePages || doc.bwDoublePagesText);
        const colSingle = parsePageList(doc.colorSinglePages || doc.colorSinglePagesText);
        const colDouble = parsePageList(doc.colorDoublePages || doc.colorDoublePagesText);

        if (bwSingle.length > 0) {
            categories.push({
                key: 'bwSingle',
                colorMode: 'B&W',
                printSide: 'Single-sided',
                count: bwSingle.length,
                pages: bwSingle,
                rangeText: formatPageRanges(bwSingle, pageCount),
                isAllPages: bwSingle.length === pageCount && bwSingle[0] === 1 && bwSingle[bwSingle.length - 1] === pageCount
            });
        }
        if (bwDouble.length > 0) {
            categories.push({
                key: 'bwDouble',
                colorMode: 'B&W',
                printSide: 'Double-sided',
                count: bwDouble.length,
                pages: bwDouble,
                rangeText: formatPageRanges(bwDouble, pageCount),
                isAllPages: bwDouble.length === pageCount && bwDouble[0] === 1 && bwDouble[bwDouble.length - 1] === pageCount
            });
        }
        if (colSingle.length > 0) {
            categories.push({
                key: 'colorSingle',
                colorMode: 'Color',
                printSide: 'Single-sided',
                count: colSingle.length,
                pages: colSingle,
                rangeText: formatPageRanges(colSingle, pageCount),
                isAllPages: colSingle.length === pageCount && colSingle[0] === 1 && colSingle[colSingle.length - 1] === pageCount
            });
        }
        if (colDouble.length > 0) {
            categories.push({
                key: 'colorDouble',
                colorMode: 'Color',
                printSide: 'Double-sided',
                count: colDouble.length,
                pages: colDouble,
                rangeText: formatPageRanges(colDouble, pageCount),
                isAllPages: colDouble.length === pageCount && colDouble[0] === 1 && colDouble[colDouble.length - 1] === pageCount
            });
        }
    } else {
        const startPage = Number(doc.startPage || 1);
        const lastPage = Number(doc.lastPage || pageCount || 1);
        const totalSelectedInRange = Math.max(1, lastPage - startPage + 1);

        const colorPagesCount = Number(doc.colorPages || 0);
        const bwPagesCount = doc.bwPages !== undefined ? Number(doc.bwPages) : Math.max(0, totalSelectedInRange - colorPagesCount);

        const rootPrintSide = doc.printSide === 'DOUBLE_SIDE' ? 'Double-sided' : 'Single-sided';
        const colorPrintSide = doc.printColorDoubleSide ? 'Double-sided' : 'Single-sided';

        let colorPagesList = [];
        if (colorPagesCount > 0) {
            colorPagesList = parsePageList(doc.colorPageNumbersText);
            if (colorPagesList.length === 0) {
                for (let p = startPage; p < startPage + colorPagesCount && p <= lastPage; p++) {
                    colorPagesList.push(p);
                }
            }
        }

        const selectedRangePages = [];
        for (let p = startPage; p <= lastPage; p++) {
            selectedRangePages.push(p);
        }

        const bwPagesList = selectedRangePages.filter(p => !colorPagesList.includes(p));

        if (bwPagesCount > 0 && bwPagesList.length > 0) {
            categories.push({
                key: 'bw',
                colorMode: 'B&W',
                printSide: rootPrintSide,
                count: bwPagesList.length,
                pages: bwPagesList,
                rangeText: formatPageRanges(bwPagesList, pageCount),
                isAllPages: bwPagesList.length === pageCount && bwPagesList[0] === 1 && bwPagesList[bwPagesList.length - 1] === pageCount
            });
        }

        if (colorPagesCount > 0 && colorPagesList.length > 0) {
            categories.push({
                key: 'color',
                colorMode: 'Color',
                printSide: colorPrintSide,
                count: colorPagesList.length,
                pages: colorPagesList,
                rangeText: formatPageRanges(colorPagesList, pageCount),
                isAllPages: colorPagesList.length === pageCount && colorPagesList[0] === 1 && colorPagesList[colorPagesList.length - 1] === pageCount
            });
        }
    }

    const totalSelectedPages = categories.reduce((sum, c) => sum + c.count, 0);
    const isAllPagesDoc = totalSelectedPages === pageCount && categories.length === 1 && categories[0].isAllPages;

    return {
        pageCount,
        copies,
        binding,
        isAdvanced,
        categories,
        totalSelectedPages,
        isAllPagesDoc
    };
};

/**
 * Returns formatted compact text strings for single-line or email contexts.
 * e.g. "B&W Double-sided: 62 pages · 7–68" or "All pages · 1–68"
 */
export const formatDocSummaryLines = (doc = {}) => {
    const details = getPageDetails(doc);
    const lines = [];

    details.categories.forEach(cat => {
        let pageDesc = '';
        if (cat.isAllPages) {
            pageDesc = `All pages · 1–${details.pageCount}`;
        } else {
            pageDesc = `${cat.count} pages · ${cat.rangeText}`;
        }
        lines.push(`${cat.colorMode} ${cat.printSide}: ${pageDesc}`);
    });

    return lines;
};

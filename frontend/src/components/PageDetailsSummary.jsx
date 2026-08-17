import React, { useState } from 'react';
import { getPageDetails } from '../utils/pageFormatter';

export const PageDetailsSummary = ({ doc, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!doc) return null;

    const details = getPageDetails(doc);
    const { pageCount, copies, binding, categories, totalSelectedPages, isAllPagesDoc } = details;

    if (categories.length === 0) {
        return (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                ⚙️ <strong>Settings:</strong> {pageCount} page(s) • {copies} copy(ies) • Binding: {binding}
            </div>
        );
    }

    // Group categories by color mode
    const bwCategories = categories.filter(c => c.colorMode === 'B&W');
    const bwTotalPages = bwCategories.reduce((sum, c) => sum + c.count, 0);

    const colorCategories = categories.filter(c => c.colorMode === 'Color');
    const colorTotalPages = colorCategories.reduce((sum, c) => sum + c.count, 0);

    // Determine if selection is complex (has multiple ranges or multiple categories)
    const isComplex = categories.some(c => c.rangeText.includes(',')) || categories.length > 1 || (totalSelectedPages > 15 && !isAllPagesDoc);

    const inlineSummaryText = categories.map(c => {
        const pageLabel = c.isAllPages ? `All pages · 1–${pageCount}` : `${c.count} pg${c.count > 1 ? 's' : ''} (${c.rangeText})`;
        return `${c.colorMode} · ${c.printSide} · ${pageLabel}`;
    }).join(' • ');

    return (
        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    ⚙️ <strong>Print Settings:</strong>{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {isAllPagesDoc ? (
                            `All pages · 1–${pageCount} • ${copies} copy(ies) • Binding: ${binding}`
                        ) : (
                            `${inlineSummaryText} • ${copies} copy(ies) • Binding: ${binding}`
                        )}
                    </span>
                </div>
                
                {isComplex && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color, #3b82f6)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-hover, rgba(59, 130, 246, 0.08))'
                        }}
                    >
                        {isExpanded ? 'Hide page details ▲' : 'View page details ▼'}
                    </button>
                )}
            </div>

            {isExpanded && (
                <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-card, rgba(0,0,0,0.03))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.8rem'
                }}>
                    {bwCategories.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                B&W · {bwTotalPages} page(s)
                            </div>
                            {bwCategories.map((cat, i) => (
                                <div key={i} style={{ paddingLeft: '0.75rem', color: 'var(--text-secondary)' }}>
                                    • {cat.printSide} · {cat.count} page(s) · {cat.isAllPages ? `All pages (1–${pageCount})` : `Pages ${cat.rangeText}`}
                                </div>
                            ))}
                        </div>
                    )}

                    {colorCategories.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                Color · {colorTotalPages} page(s)
                            </div>
                            {colorCategories.map((cat, i) => (
                                <div key={i} style={{ paddingLeft: '0.75rem', color: 'var(--text-secondary)' }}>
                                    • {cat.printSide} · {cat.count} page(s) · {cat.isAllPages ? `All pages (1–${pageCount})` : `Pages ${cat.rangeText}`}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px dashed var(--border-color)' }}>
                        Total: {totalSelectedPages} page(s) selected out of {pageCount} • {copies} copy(ies) • Binding: {binding}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageDetailsSummary;

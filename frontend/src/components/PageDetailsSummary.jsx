import React, { useState } from 'react';
import { getPageDetails } from '../utils/pageFormatter';

export const PageDetailsSummary = ({ doc, document: propDoc, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const targetDoc = doc || propDoc;

    if (!targetDoc) return null;

    const details = getPageDetails(targetDoc);
    const { pageCount, copies, binding, categories, totalSelectedPages, isAllPagesDoc } = details;

    if (categories.length === 0) {
        return (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
    const isComplex = categories.some(c => c.rangeText && c.rangeText.includes(',')) || categories.length > 1 || (totalSelectedPages > 15 && !isAllPagesDoc);

    const inlineSummaryText = categories.map(c => {
        const pageLabel = c.isAllPages ? `All pages · 1–${pageCount}` : `${c.count} pg${c.count > 1 ? 's' : ''} (${c.rangeText})`;
        return `${c.colorMode} · ${c.printSide} · ${pageLabel}`;
    }).join(' • ');

    return (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>⚙️ Print Specs:</span>
                    {colorTotalPages > 0 && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#f59e0b18',
                            color: '#d97706',
                            border: '1px solid #f59e0b40'
                        }}>
                            🎨 {colorTotalPages} Color Page{colorTotalPages > 1 ? 's' : ''}
                        </span>
                    )}
                    {bwTotalPages > 0 && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--bg-card, rgba(100,116,139,0.12))',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)'
                        }}>
                            📄 {bwTotalPages} B&W Page{bwTotalPages > 1 ? 's' : ''}
                        </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        • {copies} copy{copies > 1 ? 'ies' : ''} • Binding: {binding}
                    </span>
                </div>
                
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
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-hover, rgba(59, 130, 246, 0.08))'
                    }}
                >
                    {isExpanded ? 'Hide page breakdown ▲' : 'View page breakdown ▼'}
                </button>
            </div>

            {isExpanded && (
                <div style={{
                    marginTop: '0.6rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-card, rgba(0,0,0,0.03))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    fontSize: '0.825rem'
                }}>
                    {colorCategories.length > 0 && (
                        <div style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#fef3c722',
                            border: '1px solid #fde68a66'
                        }}>
                            <div style={{ fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                <span>🎨</span>
                                <span>Color Pages ({colorTotalPages} total)</span>
                            </div>
                            {colorCategories.map((cat, i) => (
                                <div key={i} style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                    • <strong>{cat.printSide}</strong>: {cat.count} page(s) — {cat.isAllPages ? `All pages (1–${pageCount})` : `Page(s) ${cat.rangeText}`}
                                </div>
                            ))}
                        </div>
                    )}

                    {bwCategories.length > 0 && (
                        <div style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-hover, rgba(0,0,0,0.02))',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                <span>📄</span>
                                <span>Black & White Pages ({bwTotalPages} total)</span>
                            </div>
                            {bwCategories.map((cat, i) => (
                                <div key={i} style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                    • <strong>{cat.printSide}</strong>: {cat.count} page(s) — {cat.isAllPages ? `All pages (1–${pageCount})` : `Page(s) ${cat.rangeText}`}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span>Selected: <strong>{totalSelectedPages} of {pageCount}</strong> page(s)</span>
                        <span>Copies: <strong>{copies}</strong></span>
                        <span>Binding: <strong>{binding}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageDetailsSummary;

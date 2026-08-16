# Advanced Printing Options Update

Modify the existing **Advanced Printing Options** in Configure Files:

## UI Layout Changes

* Move **Advanced Printing Options to the bottom of the file card**, after the normal Binding field.
  * Regular controls (Start/End Page, Print Side, Color Pages, Copies, Binding) appear first.
  * The Advanced Printing Options toggle checkbox is placed last, beneath the regular Binding dropdown.

* When Advanced Options is enabled, it must be **completely independent** of the regular printing controls.
  * **Ignore regular Start/End Page, Copies, Print Side, Color Pages, B&W Pages, and Binding completely.**
  * Do not use any of those regular values for pricing or order submission.
  * Advanced mode becomes the sole source of truth for the file's configuration.

* **Inside Advanced Options**, add the following controls:
  * **Start Page** — numeric input, min 1, max document page count.
  * **End Page** — numeric input, min 1, max document page count.
  * **Copies** — numeric input, min 1.
  * **Binding** — dropdown: None / Spiral Binding / Book Binding.
  * The four page-category text inputs:
    * **B/W Single** (Single-Sided B&W Pages)
    * **B/W Double** (Double-Sided B&W Pages)
    * **Color Single** (Single-Sided Color Pages)
    * **Color Double** (Double-Sided Color Pages)
  * **"Apply for rest of the pages"** radio under B/W Single and B/W Double (mutually exclusive).

---

## Page Input Rules

All four page-category inputs accept comma-separated integers.

* Trim spaces.
* Reject non-numeric values.
* Reject duplicates within the same category.
* Reject page numbers outside the detected page range (or outside the advanced Start–End page range).
* Reject pages already assigned to another category.
  * Error: `"Page X has already been assigned to another printing option. Each page can only have one printing type."`

**Single-sided categories** (B/W Single, Color Single):
* Non-continuous pages are allowed. Example: `4,9,11,27`

**Double-sided categories** (B/W Double, Color Double):
* Must be entered as **continuous pairs** — each pair of adjacent entries must be consecutive numbers.
* Valid: `2,3,6,7,9,10` → pairs: 2–3, 6–7, 9–10
* Invalid: `2,3,4,6` → 4 and 6 are not consecutive
* Invalid: `2,3,6` → 6 has no pair
* Error: `"Double-sided pages must be entered as continuous pairs, e.g. 2,3,6,7,9,10."`

---

## Apply for Rest of the Pages

Under both **B/W Single** and **B/W Double**, add a mutually exclusive radio option:

> Apply for rest of the pages

Rules:
* Only **one** of the two can be active at a time.
* When selected:
  * **Immediately clear** the corresponding page-number text input.
  * **Disable** that input so the user cannot type into it.
  * Visually indicate disabled state (grayed out, `cursor: not-allowed`, opacity 0.7).
* When the user switches from one to the other:
  * Unselect the previous radio and re-enable its input (left empty).
  * Select the new radio and clear/disable the new input.
* **Remaining pages** = All pages in the document − all explicitly assigned pages across all four categories.
  * If Apply for Rest → B/W Single: remaining pages become Single-Sided B&W.
  * If Apply for Rest → B/W Double: remaining pages become Double-Sided B&W (must still form valid continuous pairs).

---

## Validation Before Order Placement

When Advanced Printing Options is enabled, exactly one must be true:

* **Option A** — Every page in the document is explicitly assigned to a category.
* **Option B** — Apply for Rest is active for B/W Single or B/W Double, covering all remaining pages.

If pages remain unassigned and no Apply for Rest is selected, block order placement:

> "Please assign all pages or select 'Apply for rest of the pages' for either Single-Sided B&W or Double-Sided B&W."

---

## Pricing Logic

Always fetch rates from the **selected shop's pricing** — never hardcode values.

| Rate variable      | Source                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `bwSingleRate`     | `shop.printingRates?.bwSingle ?? shop.pricing?.bwPerPage ?? 0`       |
| `bwDoubleRate`     | `shop.printingRates?.bwDouble ?? shop.pricing?.bwPerPage ?? 0`       |
| `colourSingleRate` | `shop.printingRates?.colourSingle ?? shop.pricing?.colorPerPage ?? 0`|
| `colourDoubleRate` | `shop.printingRates?.colourDouble ?? shop.pricing?.colorPerPage ?? 0`|

Calculate each category independently (then multiply by copies):

| Category     | Formula |
| ------------ | ------- |
| B/W Single   | `pages × bwSingleRate` |
| B/W Double   | `Math.floor(pages/2) × bwDoubleRate + (pages%2) × bwSingleRate` |
| Color Single | `pages × colourSingleRate` |
| Color Double | `Math.floor(pages/2) × colourDoubleRate + (pages%2) × colourSingleRate` |

**Example — 68 B&W pages, Double-Sided, ₹1.50/sheet:**
```
68 ÷ 2 = 34 sheets → 34 × ₹1.50 = ₹51.00  ✓
NOT 68 × ₹1.50 = ₹102.00  ✗
```

**Example — 69 B&W pages, Double-Sided, ₹1.50/sheet, ₹1.00 single:**
```
34 sheets × ₹1.50 = ₹51.00
+  1 page  × ₹1.00 = ₹1.00
= ₹52.00  ✓
```

---

## Price Summary Display

Show an itemised breakdown in the Step 3 sidebar and Step 5 review. **Hide any row where page count is 0.**

```
B/W Single:   X page(s) × ₹Y/page            ₹Z
B/W Double:   X page(s) → N sheet(s) × ₹Y    ₹Z
Color Single: X page(s) × ₹Y/page            ₹Z
Color Double: X page(s) → N sheet(s) × ₹Y    ₹Z
──────────────────────────────────────────────
Binding                                       ₹Z
Delivery                                      ₹Z
──────────────────────────────────────────────
Estimated Total                               ₹Z
```

Price must update in real time as the user changes any input.

---

## Order Details Display

### Customer view (MyOrders)

For advanced orders, show each non-empty category:

```
Printing Mode: Advanced (2 copies • Binding: Spiral)
• Single-Sided B&W:   10 page(s)  (4, 9, 11, ...)
• Double-Sided B&W:    4 page(s)  (1, 2, 6, 7)
• Single-Sided Color:  2 page(s)  (5, 12)
• Double-Sided Color:  2 page(s)  (20, 21)
```

### Shop view (ShopOrders)

Same format. Categories with 0 pages are hidden.

### Shop email notification

```
Printing Requirements

B/W Single:   Pages 4, 9, 11
B/W Double:   Pages 1, 2, 6, 7
Color Single: Pages 5, 12
Color Double: Pages 20, 21
```

Omit any category with 0 pages. If Apply for Rest was used, store and display the **resolved page numbers** — never "apply for rest" as a string.

---

## Backend Requirements

The backend must independently validate (never trust frontend data):

* Page numbers are integers within the document range.
* No duplicates within a category.
* No overlapping pages across categories.
* Double-sided categories use valid continuous pairs.
* Complete duplex pairs (no orphan pages in double-sided inputs).
* All pages assigned, or Apply for Rest correctly resolves remaining pages.
* Recalculate the order price from the shop's actual rates.

Store the resolved page arrays in the order document:

```js
{
  printingMode: 'advanced',
  bwSinglePages: [4, 9, 11],
  bwDoublePages: [1, 2, 6, 7],
  colorSinglePages: [5, 12],
  colorDoublePages: [20, 21]
}
```

Always store the final resolved arrays (Apply for Rest expanded into actual page numbers), not raw text input.

---

## Special Instructions

The **Special Instructions** textarea has been moved from Step 4 (Order Details) to the bottom of Step 3 (Configure Files), below the file list. Ensure the stored value is associated with the order and visible to the shop.

---

## Testing Checklist

### UI & Interaction
- [ ] Advanced Printing Options toggle appears **below** the regular Binding dropdown.
- [ ] When toggled on, regular Start/End Page, Print Side, Color Pages, B&W Pages, Copies, and Binding are ignored for pricing and submission.
- [ ] Start Page, End Page, Copies, and Binding controls exist **inside** Advanced Options.
- [ ] Switching the toggle off restores regular mode and recalculates pricing.
- [ ] Apply for Rest immediately clears and disables the corresponding input.
- [ ] Switching Apply for Rest between B/W Single ↔ B/W Double works correctly.
- [ ] Only one Apply for Rest option can be active at a time.

### Validation
- [ ] Non-numeric page values are rejected.
- [ ] Out-of-range page numbers are rejected.
- [ ] Duplicate pages within a category are rejected.
- [ ] Same page in two different categories is rejected with the overlap error.
- [ ] Non-continuous duplex sequences are rejected.
- [ ] Incomplete duplex pairs (odd count in double-sided input) are rejected.
- [ ] Unassigned pages with no Apply for Rest active blocks order placement.

### Pricing
- [ ] 68 B&W Double-Sided → 34 sheets at shop rate (not 68).
- [ ] 69 B&W Double-Sided → 34 sheets + 1 single-sided page.
- [ ] Multiple copies multiply final sheet counts correctly.
- [ ] Binding, delivery, and express delivery charges are added correctly.
- [ ] All rates fetched from the selected shop — no hardcoded prices.
- [ ] Price summary updates in real time as inputs change.
- [ ] Backend recalculates and validates price independently.

### Display
- [ ] Zero-value categories hidden in Step 3 price sidebar.
- [ ] Zero-value categories hidden in Step 5 review price table.
- [ ] Zero-value categories hidden in MyOrders order details modal.
- [ ] Zero-value categories hidden in ShopOrders order details modal.
- [ ] Zero-value categories omitted from shop email notification.
- [ ] Resolved page arrays (not "apply for rest") stored in database.
- [ ] Shop email shows correct resolved page numbers per category.

### Existing Functionality
- [ ] Regular mode orders continue to work as before.
- [ ] Existing orders created before this update still open correctly.
- [ ] Shop order management unaffected.
- [ ] Admin order management unaffected.
- [ ] Order acceptance and final amount flow unaffected.
- [ ] No console errors during normal order creation.
- [ ] No API errors during order submission.

**Make sure the changes do not break anything currently working in production.**

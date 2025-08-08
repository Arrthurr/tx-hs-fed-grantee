# Green Color Palette

## Primary Color
- **Value**: `#059669`
- **Usage**: Main brand color, marker fill
- **Description**: A vibrant emerald green (equivalent to Tailwind's green-600)

## Accent Background Color
- **Value**: `#d1fae5`
- **Usage**: Light background tint for sections, cards, and highlights
- **Description**: A soft, light green tint (Tailwind's green-100) that provides excellent contrast with the primary color

## Color Relationship
These colors work well together because:
- They share the same green hue family
- The accent (#d1fae5) is approximately 85% lighter than the primary (#059669)
- The contrast ratio ensures good readability when primary text/elements are placed on accent backgrounds
- Both colors are from the Tailwind CSS green color scale, ensuring visual harmony

## Implementation Examples
```css
:root {
  --color-primary: #059669;
  --color-accent-bg: #d1fae5;
}
```

```javascript
const colors = {
  primary: '#059669',
  accentBackground: '#d1fae5'
};
```

import { CustomFont } from '../constants/defaultSettings';

const FONT_STYLE_ID_PREFIX = 'custom-font-';

export const applyCustomFonts = (customFonts: CustomFont[]): void => {
  const head = document.head;

  // First, remove old custom font styles that might no longer be in use
  const existingStyles = head.querySelectorAll(`style[id^="${FONT_STYLE_ID_PREFIX}"]`);
  existingStyles.forEach(style => {
    const fontName = style.id.replace(FONT_STYLE_ID_PREFIX, '');
    if (!customFonts.some(f => f.name === fontName)) {
      head.removeChild(style);
    }
  });

  // Then, add or update styles for the current custom fonts
  customFonts.forEach(font => {
    const styleId = `${FONT_STYLE_ID_PREFIX}${font.name}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      head.appendChild(styleElement);
    }
    
    const fontFaceRule = `
      @font-face {
        font-family: "${font.name}";
        src: url(${font.dataUrl});
      }
    `;

    if (styleElement.textContent !== fontFaceRule) {
      styleElement.textContent = fontFaceRule;
    }
  });
};

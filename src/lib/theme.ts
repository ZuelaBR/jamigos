// Theme preference shared by server (initial render) and client (toggle).
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'theme';

export function parseTheme(value: string | undefined | null): Theme {
	return value === 'light' || value === 'dark' ? value : 'system';
}

/** Applies the theme immediately and remembers it for future server renders. */
export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme === 'system' ? '' : theme;
	document.cookie =
		theme === 'system'
			? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
			: `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

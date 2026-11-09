// Bound offsets as well as rejecting values SQLite cannot use as an integer offset.
const MAX_PAGE = 10000;

export function parsePage(value: string | null): number {
	const page = Number(value);
	return Number.isSafeInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

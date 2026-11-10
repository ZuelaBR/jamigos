/** Keyboard and focus behavior shared by the account and theme menus. */
export function menuNavigation(
	node: HTMLElement,
	{ onclose, trigger }: { onclose: () => void; trigger: HTMLElement | undefined }
) {
	const items = () => Array.from(node.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
	queueMicrotask(() => items()[0]?.focus());
	function outside(event: PointerEvent) {
		const target = event.target as Node;
		if (!node.contains(target) && !trigger?.contains(target)) onclose();
	}

	function onkeydown(event: KeyboardEvent) {
		const entries = items();
		const current = entries.indexOf(document.activeElement as HTMLElement);
		let next: number;
		switch (event.key) {
			case 'ArrowDown':
				next = (current + 1) % entries.length;
				break;
			case 'ArrowUp':
				next = (current - 1 + entries.length) % entries.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = entries.length - 1;
				break;
			case 'Escape':
				event.preventDefault();
				onclose();
				trigger?.focus();
				return;
			case 'Tab': {
				// Leave the menu as one control, rather than tabbing through every item.
				const controls = Array.from(
					document.querySelectorAll<HTMLElement>(
						'a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
					)
				).filter((element) => !node.contains(element) && element.getClientRects().length);
				const index = trigger ? controls.indexOf(trigger) : -1;
				const target = controls[index + (event.shiftKey ? -1 : 1)];
				event.preventDefault();
				onclose();
				(target ?? trigger)?.focus();
				return;
			}
			default:
				return;
		}
		event.preventDefault();
		entries[next]?.focus();
	}
	node.addEventListener('keydown', onkeydown);
	document.addEventListener('pointerdown', outside, true);
	return {
		destroy: () => {
			node.removeEventListener('keydown', onkeydown);
			document.removeEventListener('pointerdown', outside, true);
		}
	};
}

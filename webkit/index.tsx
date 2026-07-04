// Steam Currency Converter - Webkit DOM price injector
// Author: MehmetCanWT
import { callable } from '@steambrew/webkit';

// Declare raw IPC method (returns string due to IPCType constraints)
const getRatesAndSettingsRaw = callable<[], string>('get_rates_and_settings');

// Helper wrapper to parse JSON response
const getRatesAndSettings = async () => {
	const res = await getRatesAndSettingsRaw();
	return JSON.parse(res) as { rates: Record<string, number>; timestamp: number; targetCurrency: string; displayMode: string };
};

// Regex patterns to match price structures, including currency symbols/codes and decimals/thousands separators
const pricePattern = /(?:(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB)\s*(\d+(?:[\d.,]*\d+)?)(?:\s*(?:USD|EUR|GBP|TRY|RUB|TL))?)|(?:(\d+(?:[\d.,]*\d+)?)\s*(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB))/i;
const pricePatternGlobal = /(?:(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB)\s*\d+(?:[\d.,]*\d+)?(?:\s*(?:USD|EUR|GBP|TRY|RUB|TL))?)|(?:\d+(?:[\d.,]*\d+)?\s*(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB))/gi;

function detectSourceCurrency(str: string): string {
	const s = str.toUpperCase();
	if (s.includes('€') || s.includes('EUR')) return 'EUR';
	if (s.includes('£') || s.includes('GBP')) return 'GBP';
	if (s.includes('₺') || s.includes('TL') || s.includes('TRY')) return 'TRY';
	if (s.includes('₽') || s.includes('RUB') || s.includes('РУБ')) return 'RUB';
	return 'USD'; // default fallback
}

function parsePriceValue(str: string): number {
	let clean = str.trim();
	clean = clean.replace(/[^\d.,]/g, '');

	if (clean.includes(',') && clean.includes('.')) {
		const first = clean.indexOf(',');
		const second = clean.indexOf('.');
		if (first < second) {
			clean = clean.replace(/,/g, '');
		} else {
			clean = clean.replace(/\./g, '').replace(',', '.');
		}
	} else if (clean.includes(',')) {
		const parts = clean.split(',');
		if (parts[parts.length - 1].length === 2) {
			clean = clean.replace(/,/g, '.');
		} else {
			clean = clean.replace(/,/g, '');
		}
	}

	return parseFloat(clean);
}

function formatPrice(value: number, currency: string): string {
	if (isNaN(value)) return '';

	// Use user's system locale for decimal/thousands formatting
	const formattedNum = value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	switch (currency) {
		case 'TRY':
			return `₺${formattedNum}`; // Use standard Turkish Lira symbol prefix
		case 'EUR':
			return `€${formattedNum}`;
		case 'GBP':
			return `£${formattedNum}`;
		case 'USD':
			return `$${formattedNum}`;
		case 'RUB':
			return `${formattedNum} ₽`;
		default:
			return `${formattedNum} ${currency}`;
	}
}

function convertPriceInString(
	str: string,
	rates: Record<string, number>,
	targetCurrency: string,
	displayMode: string,
): string | null {
	const match = str.match(pricePattern);
	if (!match) return null;

	const rawNumberStr = match[1] || match[2];
	if (!rawNumberStr) return null;

	const sourceCurrency = detectSourceCurrency(match[0]);
	const value = parsePriceValue(rawNumberStr);
	if (isNaN(value)) return null;

	// Don't convert if source and target are the same
	if (sourceCurrency === targetCurrency) return null;

	const sourceRate = rates[sourceCurrency] || (sourceCurrency === 'USD' ? 1.0 : null);
	const targetRate = rates[targetCurrency] || (targetCurrency === 'USD' ? 1.0 : null);

	if (!sourceRate || !targetRate) return null;

	const usdValue = value / sourceRate;
	const convertedValue = usdValue * targetRate;

	const formattedConverted = formatPrice(convertedValue, targetCurrency);

	const originalPriceStr = match[0];
	let replacement = '';
	if (displayMode === 'append') {
		replacement = `${originalPriceStr} (~${formattedConverted})`;
	} else {
		replacement = formattedConverted;
	}

	return str.replace(originalPriceStr, replacement);
}

// Processes individual DOM nodes recursively
function processNode(
	node: Node,
	rates: Record<string, number>,
	targetCurrency: string,
	displayMode: string,
) {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.nodeValue || '';
		if (pricePattern.test(text)) {
			const parent = node.parentElement;
			if (!parent) return;

			const tagName = parent.tagName.toLowerCase();
			if (tagName === 'script' || tagName === 'style' || tagName === 'textarea') return;

			// Skip if already processed and text hasn't changed
			const lastProcessed = parent.getAttribute('data-converted-text');
			if (lastProcessed === parent.textContent) {
				return;
			}

			const converted = convertPriceInString(text, rates, targetCurrency, displayMode);
			if (converted) {
				parent.setAttribute('data-original-text', text);
				parent.setAttribute('data-converted-text', converted);
				node.nodeValue = converted;
			}
		}
	} else if (node.nodeType === Node.ELEMENT_NODE) {
		const el = node as HTMLElement;
		const textContent = el.textContent || '';

		// If this is a container containing multiple separate price values (e.g. original AND discounted final price),
		// we skip converting on this container node level, and let children process their own text nodes individually.
		// This preserves HTML structure, styles, fonts, and strikes.
		const matches = textContent.match(pricePatternGlobal);
		if (matches && matches.length > 1) {
			for (let i = 0; i < el.childNodes.length; i++) {
				processNode(el.childNodes[i], rates, targetCurrency, displayMode);
			}
			return;
		}

		// Otherwise, process all child nodes
		for (let i = 0; i < el.childNodes.length; i++) {
			processNode(el.childNodes[i], rates, targetCurrency, displayMode);
		}
	}
}

let observer: MutationObserver | null = null;

function startObservation(rates: Record<string, number>, targetCurrency: string, displayMode: string) {
	if (observer) {
		observer.disconnect();
	}

	processNode(document.body, rates, targetCurrency, displayMode);

	observer = new MutationObserver((mutations) => {
		observer?.disconnect();
		try {
			for (const mutation of mutations) {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						processNode(node, rates, targetCurrency, displayMode);
					});
				} else if (mutation.type === 'characterData') {
					processNode(mutation.target, rates, targetCurrency, displayMode);
				}
			}
		} catch (e) {
			console.error('[CurrencyConverter] Mutation observer error:', e);
		} finally {
			if (observer) {
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					characterData: true,
				});
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
	});
}

let currentSettings = {
	targetCurrency: 'TRY',
	displayMode: 'append',
	timestamp: 0,
};

async function checkSettingsChanged(rates: Record<string, number>) {
	try {
		const data = await getRatesAndSettings();
		if (
			data &&
			(data.targetCurrency !== currentSettings.targetCurrency ||
				data.displayMode !== currentSettings.displayMode ||
				data.timestamp !== currentSettings.timestamp)
		) {
			console.log('[CurrencyConverter] Settings changed, re-converting prices...');
			currentSettings = data;

			document.querySelectorAll('[data-converted-text]').forEach((el) => {
				const orig = el.getAttribute('data-original-text');
				if (orig) {
					// Restore original text node content
					for (let i = 0; i < el.childNodes.length; i++) {
						const child = el.childNodes[i];
						if (child.nodeType === Node.TEXT_NODE) {
							child.nodeValue = orig;
						}
					}
				}
				el.removeAttribute('data-converted-text');
				el.removeAttribute('data-original-text');
			});

			startObservation(data.rates || rates, data.targetCurrency, data.displayMode);
		}
	} catch (e) {
		console.error('[CurrencyConverter] Failed to check settings:', e);
	}
}

export default async function WebkitMain() {
	console.log('[CurrencyConverter] Webkit main loaded');
	try {
		const data = await getRatesAndSettings();
		if (data && data.rates) {
			currentSettings = data;
			startObservation(data.rates, data.targetCurrency, data.displayMode);

			// Periodically check for settings changes
			setInterval(() => {
				checkSettingsChanged(data.rates);
			}, 5000);

			// Also check on window focus
			window.addEventListener('focus', () => {
				checkSettingsChanged(data.rates);
			});
		} else {
			console.error('[CurrencyConverter] Failed to load initial rates from backend');
		}
	} catch (error) {
		console.error('[CurrencyConverter] Webkit entry failed:', error);
	}
}

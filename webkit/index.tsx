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

const pricePattern = /(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB)\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:\$|USD|€|EUR|£|GBP|₺|TL|TRY|₽|RUB)/i;

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

	const formattedNum = value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	switch (currency) {
		case 'TRY':
			return `${formattedNum} TL`;
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

	const sourceCurrency = detectSourceCurrency(str);
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

function processElement(
	el: HTMLElement,
	rates: Record<string, number>,
	targetCurrency: string,
	displayMode: string,
) {
	const tagName = el.tagName.toLowerCase();
	if (tagName === 'script' || tagName === 'style' || tagName === 'textarea') return;

	const isPriceSelector =
		el.classList.contains('discount_original_price') ||
		el.classList.contains('discount_final_price') ||
		el.classList.contains('game_purchase_price') ||
		el.classList.contains('search_price') ||
		el.classList.contains('normal_price') ||
		el.classList.contains('price') ||
		el.classList.contains('bb_price') ||
		el.classList.contains('purchase_price') ||
		el.classList.contains('market_listing_price') ||
		el.classList.contains('market_table_value') ||
		el.classList.contains('saleprice') ||
		el.classList.contains('cart_item_price_value') ||
		el.classList.contains('item_desc_price') ||
		el.classList.contains('cart_item_price') ||
		/price/i.test(el.className);

	const directText = Array.from(el.childNodes)
		.filter((n) => n.nodeType === Node.TEXT_NODE)
		.map((n) => n.nodeValue)
		.join('')
		.trim();

	const hasPricePattern = pricePattern.test(directText);

	if (isPriceSelector || hasPricePattern) {
		const lastProcessedText = el.getAttribute('data-converted-text');
		const currentText = el.textContent || '';

		if (lastProcessedText === currentText) {
			return; // Already converted and unchanged
		}

		const originalText = currentText;
		const converted = convertPriceInString(originalText, rates, targetCurrency, displayMode);
		if (converted) {
			el.setAttribute('data-original-text', originalText);
			el.setAttribute('data-converted-text', converted);

			let replaced = false;
			for (let i = 0; i < el.childNodes.length; i++) {
				const child = el.childNodes[i];
				if (child.nodeType === Node.TEXT_NODE) {
					const text = child.nodeValue || '';
					if (pricePattern.test(text)) {
						const childConverted = convertPriceInString(text, rates, targetCurrency, displayMode);
						if (childConverted) {
							child.nodeValue = childConverted;
							replaced = true;
						}
					}
				}
			}
			if (!replaced) {
				el.textContent = converted;
			}
		}
	} else {
		for (let i = 0; i < el.children.length; i++) {
			processElement(el.children[i] as HTMLElement, rates, targetCurrency, displayMode);
		}
	}
}

let observer: MutationObserver | null = null;

function startObservation(rates: Record<string, number>, targetCurrency: string, displayMode: string) {
	if (observer) {
		observer.disconnect();
	}

	processElement(document.body, rates, targetCurrency, displayMode);

	observer = new MutationObserver((mutations) => {
		observer?.disconnect();
		try {
			for (const mutation of mutations) {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							processElement(node as HTMLElement, rates, targetCurrency, displayMode);
						}
					});
				} else if (mutation.type === 'characterData') {
					const parent = mutation.target.parentElement;
					if (parent) {
						processElement(parent, rates, targetCurrency, displayMode);
					}
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
				el.removeAttribute('data-converted-text');
				const orig = el.getAttribute('data-original-text');
				if (orig) {
					el.textContent = orig;
				}
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

// Steam Currency Converter - Settings UI Component
// Author: MehmetCanWT
import { useState, useEffect } from 'react';
import {
	definePlugin,
	IconsModule,
	usePluginConfig,
	callable,
	DropdownItem,
	DropdownOption,
	Field,
	DialogButton,
} from '@steambrew/client';

// Declare raw IPC methods (restricted to returning primitive string due to IPCType constraints)
const getRatesAndSettingsRaw = callable<[], string>('get_rates_and_settings');
const fetchRatesRaw = callable<[], string>('fetch_rates');
const checkAndUpdateRatesRaw = callable<[], string>('check_and_update_rates');

// Helper wrappers to handle JSON parsing
const getRatesAndSettings = async () => {
	const res = await getRatesAndSettingsRaw();
	return JSON.parse(res) as { rates: Record<string, number>; timestamp: number; targetCurrency: string; displayMode: string };
};

const fetchRates = async () => {
	const res = await fetchRatesRaw();
	return JSON.parse(res) as { rates: Record<string, number>; timestamp: number } | null;
};

const checkAndUpdateRates = async () => {
	const res = await checkAndUpdateRatesRaw();
	return JSON.parse(res) as { rates: Record<string, number>; timestamp: number } | null;
};

const currencyOptions: DropdownOption[] = [
	{ data: 'TRY', label: 'Turkish Lira (TRY)' },
	{ data: 'USD', label: 'US Dollar (USD)' },
	{ data: 'EUR', label: 'Euro (EUR)' },
	{ data: 'GBP', label: 'British Pound (GBP)' },
	{ data: 'BRL', label: 'Brazilian Real (BRL)' },
	{ data: 'RUB', label: 'Russian Ruble (RUB)' },
	{ data: 'CAD', label: 'Canadian Dollar (CAD)' },
	{ data: 'AUD', label: 'Australian Dollar (AUD)' },
	{ data: 'JPY', label: 'Japanese Yen (JPY)' },
	{ data: 'CNY', label: 'Chinese Yuan (CNY)' },
	{ data: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
	{ data: 'KZT', label: 'Kazakhstani Tenge (KZT)' },
];

const displayModeOptions: DropdownOption[] = [
	{ data: 'append', label: 'Append (e.g. $10.00 (~330.00 TRY))' },
	{ data: 'replace', label: 'Replace (e.g. 330.00 TRY)' },
];

const SettingsContent = () => {
	const [targetCurrency, setTargetCurrency] = usePluginConfig<string>('target_currency');
	const [displayMode, setDisplayMode] = usePluginConfig<string>('display_mode');

	const [lastUpdatedText, setLastUpdatedText] = useState<string>('Loading...');
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

	// Format timestamp helper
	const formatTimestamp = (timestamp: number) => {
		if (!timestamp || timestamp === 0) return 'Never';
		const date = new Date(timestamp * 1000);
		return date.toLocaleString();
	};

	// Fetch rates metadata from backend
	const updateStatusFromBackend = async () => {
		try {
			const data = await getRatesAndSettings();
			if (data && data.timestamp) {
				setLastUpdatedText(formatTimestamp(data.timestamp));
			} else {
				setLastUpdatedText('No rates cached');
			}
		} catch (error) {
			console.error('[CurrencyConverter] Failed to get status:', error);
			setLastUpdatedText('Error getting status');
		}
	};

	useEffect(() => {
		// Get initial cache status
		updateStatusFromBackend();

		// Periodically check and trigger update (every 5 minutes, backend will decide if actual API call is needed based on cache age)
		const interval = setInterval(async () => {
			try {
				await checkAndUpdateRates();
				updateStatusFromBackend();
			} catch (e) {
				console.error('[CurrencyConverter] Periodic check failed:', e);
			}
		}, 5 * 60 * 1000);

		return () => clearInterval(interval);
	}, []);

	// Handle manual refresh
	const handleManualRefresh = async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);
		setLastUpdatedText('Refreshing...');

		try {
			const data = await fetchRates();
			if (data && data.timestamp) {
				setLastUpdatedText(formatTimestamp(data.timestamp));
			} else {
				setLastUpdatedText('Failed to refresh rates');
			}
		} catch (error) {
			console.error('[CurrencyConverter] Manual refresh failed:', error);
			setLastUpdatedText('Error refreshing rates');
		} finally {
			setIsRefreshing(false);
		}
	};

	const currentCurrencyOption = currencyOptions.find((opt) => opt.data === (targetCurrency || 'TRY')) || currencyOptions[0];
	const currentDisplayModeOption = displayModeOptions.find((opt) => opt.data === (displayMode || 'append')) || displayModeOptions[0];

	return (
		<>
			<DropdownItem
				label="Target Currency"
				description="Select the currency you want to display Steam store/market prices in."
				icon={<IconsModule.Settings />}
				rgOptions={currencyOptions}
				selectedOption={currentCurrencyOption}
				onChange={(opt) => setTargetCurrency(opt.data)}
				bottomSeparator="standard"
				focusable
			/>

			<DropdownItem
				label="Display Mode"
				description="Choose whether to show the converted price next to the original price, or completely replace it."
				icon={<IconsModule.Settings />}
				rgOptions={displayModeOptions}
				selectedOption={currentDisplayModeOption}
				onChange={(opt) => setDisplayMode(opt.data)}
				bottomSeparator="standard"
				focusable
			/>

			<Field
				label="Update Rates Cache"
				description={`Last updated: ${lastUpdatedText}`}
				icon={<IconsModule.Settings />}
				bottomSeparator="none"
				focusable
			>
				<DialogButton onClick={handleManualRefresh} disabled={isRefreshing}>
					{isRefreshing ? 'Refreshing...' : 'Refresh Now'}
				</DialogButton>
			</Field>
		</>
	);
};

export default definePlugin(() => {
	return {
		title: 'Currency Converter',
		icon: <IconsModule.Settings />,
		content: <SettingsContent />,
	};
});

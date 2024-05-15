export const dateWithoutTimezone = (dateParam?: Date) => {
	const date = dateParam || new Date();
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const withoutTimezone = new Date(date.valueOf() - timezoneOffset);

	return withoutTimezone;
};

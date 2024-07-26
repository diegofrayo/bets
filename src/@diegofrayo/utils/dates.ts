export const dateWithoutTimezone = (dateParam?: Date) => {
	const date = dateParam || new Date();
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const withoutTimezone = new Date(date.valueOf() - timezoneOffset);

	return withoutTimezone;
};

export const dateWithoutTime = (dateParam?: Date) => {
	const date = dateParam || new Date();

	date.setMinutes(0);
	date.setHours(0);
	date.setSeconds(0);
	date.setMilliseconds(0);

	return date;
};

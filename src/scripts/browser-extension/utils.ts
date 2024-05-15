export function getTextContent(element: Element | null) {
	if (!element) {
		return "";
	}

	// TODO: Use Node constant
	const TEXT_NODE = 3;
	let text = "";

	for (let i = 0; i < element.childNodes.length; ++i) {
		if (element.childNodes[i].nodeType === TEXT_NODE) {
			text += element.childNodes[i].textContent || "";
		}
	}

	// TODO: Some results are unexpected
	return text.trim();
}

export function getTextContentAsNumber(element: Element | null) {
	return Number(getTextContent(element).replace(".", "").replace(",", "").replace("$", ""));
}

export function parseHTML(html: string) {
	// 	const { JSDOM } = require("jsdom");
	// 	const dom = new JSDOM(html);
	// 	return dom.window.document;

	return new DOMParser().parseFromString(html, "text/html");
}

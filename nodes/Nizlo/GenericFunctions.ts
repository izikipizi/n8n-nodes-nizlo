import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

export type NizloResource = 'customer' | 'site' | 'device' | 'alert';

const resourcePaths: Record<NizloResource, string> = {
	customer: '/customers',
	site: '/sites',
	device: '/devices',
	alert: '/alerts',
};

export function resourcePath(resource: NizloResource): string {
	return resourcePaths[resource];
}

export function compactQuery(values: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null),
	);
}

export function listItems(response: unknown): IDataObject[] {
	if (!response || typeof response !== 'object') return [];
	const items = (response as { items?: unknown }).items;
	if (!Array.isArray(items)) return [];
	return items.filter((item): item is IDataObject => Boolean(item) && typeof item === 'object');
}

export function listTotal(response: unknown): number | undefined {
	if (!response || typeof response !== 'object') return undefined;
	const total = (response as { total?: unknown }).total;
	return typeof total === 'number' && Number.isFinite(total) && total >= 0 ? total : undefined;
}

export async function nizloApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
): Promise<unknown> {
	const options: IHttpRequestOptions = {
		method,
		url: `https://app.nizlo.com/api/v1${path}`,
		qs,
		json: true,
	};

	return this.helpers.httpRequestWithAuthentication.call(this, 'nizloApi', options);
}

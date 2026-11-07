import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	compactQuery,
	listItems,
	listTotal,
	nizloApiRequest,
	resourcePath,
	type NizloResource,
} from './GenericFunctions';

const listOnly = { operation: ['getMany'] };

const listControls: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: listOnly },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 10000 },
		displayOptions: { show: { operation: ['getMany'], returnAll: [false] } },
		default: 50,
		description: 'Max number of results to return',
	},
];

const commonSearch: INodeProperties = {
	displayName: 'Search',
	name: 'search',
	type: 'string',
	default: '',
	description: 'Search text applied by the Nizlo API within the selected resource',
};

const lifecycle: INodeProperties = {
	displayName: 'Lifecycle',
	name: 'lifecycle',
	type: 'options',
	options: [
		{ name: 'Active', value: 'active' },
		{ name: 'Archived', value: 'archived' },
	],
	default: 'active',
};

const customerFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'customerFilters',
	type: 'collection',
	placeholder: 'Add Filter',
	displayOptions: { show: { resource: ['customer'], operation: ['getMany'] } },
	default: {},
	options: [commonSearch, lifecycle],
};

const siteFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'siteFilters',
	type: 'collection',
	placeholder: 'Add Filter',
	displayOptions: { show: { resource: ['site'], operation: ['getMany'] } },
	default: {},
	options: [
		commonSearch,
		{
			displayName: 'Customer ID',
			name: 'customerId',
			type: 'string',
			default: '',
			description: 'Return sites belonging to this customer UUID',
		},
		lifecycle,
	],
};

const deviceFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'deviceFilters',
	type: 'collection',
	placeholder: 'Add Filter',
	displayOptions: { show: { resource: ['device'], operation: ['getMany'] } },
	default: {},
	options: [
		{
			displayName: 'Attention',
			name: 'attention',
			type: 'options',
			options: [
				{ name: 'Active Alerts', value: 'ALERTS' },
				{ name: 'Agent Outdated', value: 'AGENT_OUTDATED' },
				{ name: 'Agent Unknown', value: 'AGENT_UNKNOWN' },
				{ name: 'Any', value: '' },
				{ name: 'Low Disk', value: 'LOW_DISK' },
				{ name: 'Maintenance', value: 'MAINTENANCE' },
				{ name: 'Patch Scan Due', value: 'PATCH_SCAN_DUE' },
				{ name: 'Reboot Required', value: 'REBOOT' },
			],
			default: '',
		},
		{ displayName: 'Customer ID', name: 'customerId', type: 'string', default: '' },
		{
			displayName: 'Favorites Only',
			name: 'favorite',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Kind',
			name: 'kind',
			type: 'options',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Server', value: 'SERVER' },
				{ name: 'Workstation', value: 'WORKSTATION' },
			],
			default: '',
		},
		lifecycle,
		{
			displayName: 'Platform',
			name: 'platform',
			type: 'options',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Linux', value: 'LINUX' },
				{ name: 'macOS', value: 'MACOS' },
				{ name: 'Windows', value: 'WINDOWS' },
			],
			default: '',
		},
		commonSearch,
		{ displayName: 'Site ID', name: 'siteId', type: 'string', default: '' },
		{
			displayName: 'Sort',
			name: 'sort',
			type: 'options',
			options: [
				{ name: 'Hostname', value: 'hostname' },
				{ name: 'Customer', value: 'customer' },
				{ name: 'Last Seen', value: 'lastSeen' },
			],
			default: 'hostname',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Offline', value: 'offline' },
				{ name: 'Online', value: 'online' },
				{ name: 'Unknown', value: 'unknown' },
			],
			default: '',
		},
		{
			displayName: 'Summary View',
			name: 'summary',
			type: 'boolean',
			default: true,
			description: 'Whether to request the smaller summary projection instead of full list details',
		},
		{ displayName: 'Tag ID', name: 'tagId', type: 'string', default: '' },
	],
};

const alertSources = [
	['Device Offline', 'monitor:device-offline:v1'],
	['CPU Usage High', 'monitor:cpu-high:v1'],
	['Memory Usage High', 'monitor:memory-high:v1'],
	['System Temperature High', 'monitor:temperature-high:v1'],
	['Network Download Usage High', 'monitor:network-receive-high:v1'],
	['Network Upload Usage High', 'monitor:network-send-high:v1'],
	['Disk Space Low', 'monitor:disk-low:v1'],
	['Physical Disk Health', 'monitor:physical-disk-health:v1'],
	['Battery Health', 'monitor:battery-health:v1'],
	['Excessive Device Uptime', 'monitor:uptime-high:v1'],
	['Pending Reboot', 'monitor:pending-reboot:v1'],
	['Agent Update Required', 'monitor:agent-outdated:v1'],
	['Microsoft Defender Disabled', 'monitor:defender-disabled:v1'],
	['Windows Firewall Disabled', 'monitor:firewall-disabled:v1'],
	['Windows Activation', 'monitor:windows-activation:v1'],
	['Windows Update Failure', 'monitor:windows-update-failure:v1'],
	['Critical Windows Event', 'monitor:windows-event:v1'],
	['Windows Service Stopped', 'monitor:service-stopped:v1'],
] as const;

const alertFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'alertFilters',
	type: 'collection',
	placeholder: 'Add Filter',
	displayOptions: { show: { resource: ['alert'], operation: ['getMany'] } },
	default: {},
	options: [
		{ displayName: 'Alert ID', name: 'alertId', type: 'string', default: '' },
		{
			displayName: 'Assignment',
			name: 'assigned',
			type: 'string',
			default: '',
			placeholder: 'me, unassigned, or technician UUID',
			description: 'Use "me", "unassigned", or a technician UUID',
		},
		{ displayName: 'Customer ID', name: 'customerId', type: 'string', default: '' },
		{ displayName: 'Device ID', name: 'deviceId', type: 'string', default: '' },
		commonSearch,
		{
			displayName: 'Severity',
			name: 'severity',
			type: 'options',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Critical', value: 'CRITICAL' },
				{ name: 'Warning', value: 'WARNING' },
				{ name: 'Info', value: 'INFO' },
			],
			default: '',
		},
		{ displayName: 'Site ID', name: 'siteId', type: 'string', default: '' },
		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			options: [
				{ name: 'Any', value: '' },
				...alertSources.map(([name, value]) => ({ name, value })),
			],
			default: '',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			options: [
				{ name: 'Acknowledged', value: 'ACKNOWLEDGED' },
				{ name: 'Active (Any Unresolved)', value: 'ACTIVE' },
				{ name: 'Any', value: '' },
				{ name: 'Open', value: 'OPEN' },
				{ name: 'Resolved', value: 'RESOLVED' },
				{ name: 'Snoozed', value: 'SNOOZED' },
			],
			default: 'ACTIVE',
		},
	],
};

function filtersFor(
	context: IExecuteFunctions,
	resource: NizloResource,
	itemIndex: number,
): IDataObject {
	const name = `${resource}Filters`;
	const filters = context.getNodeParameter(name, itemIndex, {}) as IDataObject;
	if (resource === 'device') {
		return compactQuery({
			...filters,
			favorite: filters.favorite === true ? 'true' : undefined,
			view: filters.summary === false ? undefined : 'summary',
			summary: undefined,
		});
	}
	return compactQuery(filters);
}

export class Nizlo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nizlo',
		name: 'nizlo',
		icon: 'file:nizlo.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read tenant-scoped RMM data from Nizlo',
		defaults: { name: 'Nizlo' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'nizloApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Alert', value: 'alert' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Endpoint', value: 'device' },
					{ name: 'Site', value: 'site' },
				],
				default: 'device',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['customer', 'site', 'device'] } },
				options: [
					{ name: 'Get', value: 'get', action: 'Get a resource' },
					{ name: 'Get Many', value: 'getMany', action: 'Get many resources' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['alert'] } },
				options: [{ name: 'Get Many', value: 'getMany', action: 'Get many alerts' }],
				default: 'getMany',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['customer', 'site', 'device'], operation: ['get'] },
				},
				default: '',
				description: 'UUID of the customer, site, or endpoint to retrieve',
			},
			...listControls,
			customerFilters,
			siteFilters,
			deviceFilters,
			alertFilters,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const output: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as NizloResource;
				const operation = this.getNodeParameter('operation', itemIndex) as 'get' | 'getMany';
				const path = resourcePath(resource);

				if (operation === 'get') {
					if (resource === 'alert') {
						throw new NodeOperationError(this.getNode(), 'Alerts support Get Many only', {
							itemIndex,
						});
					}
					const id = this.getNodeParameter('id', itemIndex) as string;
					const response = await nizloApiRequest.call(
						this,
						'GET',
						`${path}/${encodeURIComponent(id)}`,
					);
					if (response && typeof response === 'object') {
						output.push({ json: response as IDataObject, pairedItem: itemIndex });
					}
					continue;
				}

				const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
				const limit = returnAll ? Number.POSITIVE_INFINITY : (this.getNodeParameter('limit', itemIndex) as number);
				const pageSize = returnAll ? 200 : Math.min(limit, 200);
				const collected: IDataObject[] = [];
				let page = 1;

				while (collected.length < limit) {
					const response = await nizloApiRequest.call(this, 'GET', path, {
						...filtersFor(this, resource, itemIndex),
						page,
						pageSize,
					});
					const batch = listItems(response);
					collected.push(...batch);
					const total = listTotal(response);
					if (!returnAll || batch.length === 0 || (total !== undefined && collected.length >= total)) break;
					page += 1;
				}

				for (const item of collected.slice(0, limit)) {
					output.push({ json: item, pairedItem: itemIndex });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({
						json: inputItems[itemIndex].json,
						error,
						pairedItem: itemIndex,
					});
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [output];
	}
}
